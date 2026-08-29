const express = require("express");

const router = express.Router();

const pool   = require("../config/db");

const bcrypt = require("bcrypt");

const {
  registerUser,
  loginUser,
  changePassword,
} = require(
  "../controllers/authController"
);

// REGISTER
router.post(
  "/register",
  registerUser
);

// LOGIN
router.post(
  "/login",
  loginUser
);

// CHANGE PASSWORD
router.put(
  "/change-password",
  changePassword
);

// VERIFY PASSWORD (used by profile edit gate)
router.post("/verify-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (!result.rows[0]) return res.json({ valid: false });
    const valid = await bcrypt.compare(password, result.rows[0].password);
    res.json({ valid });
  } catch (error) {
    console.log(error.message);
    res.json({ valid: false });
  }
});

// RESET PASSWORD (verify by email, set new password directly)
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: "Email and new password required." });
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (!result.rows[0]) return res.status(404).json({ message: "No account found with that email." });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hashed, email]);
    res.json({ message: "Password reset successfully ✅" });
  } catch (e) {
    console.log(e.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET CURRENT USER (used by mobile app)
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, "secretkey");
    const result = await pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [decoded.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// ─── OTP (email-based) ───────────────────────────────────────────────────────
// Ensure two_fa_email column exists
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_email VARCHAR(255)`)
  .then(() => console.log("two_fa_email column ready ✅"))
  .catch(e => console.error("two_fa_email migration error:", e.message));

const otpStore = {};

async function sendEmailOtp(toEmail, otp) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass || gmailPass === "YOUR_GMAIL_APP_PASSWORD") {
    console.log(`[OTP DEV] ${toEmail} → ${otp}`);
    return { dev: true };
  }
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });
  await transporter.sendMail({
    from: `"BuildCore ERP" <${gmailUser}>`,
    to: toEmail,
    subject: "Your BuildCore OTP",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:420px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;padding:32px;">
        <div style="font-size:28px;font-weight:900;color:#f59e0b;letter-spacing:.05em;margin-bottom:8px;">BUILDCORE</div>
        <div style="font-size:15px;color:#94a3b8;margin-bottom:28px;">Construction ERP Platform</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:10px;">Your one-time password:</div>
        <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#f59e0b;margin-bottom:20px;">${otp}</div>
        <div style="font-size:12px;color:#475569;">Valid for 10 minutes. Do not share this code.</div>
      </div>`,
  });
  return { sent: true };
}

// ENABLE 2FA — saves verified email to user's DB record
router.post("/enable-2fa", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, "secretkey");
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required." });
    await pool.query("UPDATE users SET two_fa_email = $1 WHERE id = $2", [email.trim().toLowerCase(), decoded.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// REQUEST OTP
router.post("/request-otp", async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) return res.status(400).json({ message: "Email required." });
    const key = email.trim().toLowerCase();

    // If login purpose — just check if account exists
    if (purpose === "login") {
      const check = await pool.query("SELECT id FROM users WHERE email = $1", [key]);
      if (!check.rows.length) return res.status(404).json({ message: "No account found with this email." });
    }

    const otp    = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + 10 * 60 * 1000;
    otpStore[key] = { otp, expiry };
    try {
      const result = await sendEmailOtp(key, otp);
      if (result.dev) return res.json({ success: true, otp, message: "OTP generated (dev)" });
      res.json({ success: true, message: `OTP sent to ${email}` });
    } catch (err) {
      console.error("[Email OTP error]", err.message);
      res.json({ success: true, otp, message: err.message });
    }
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP required." });
    const key = email.trim().toLowerCase();
    const record = otpStore[key];
    if (!record) return res.status(400).json({ message: "No OTP sent to this email." });
    if (Date.now() > record.expiry) { delete otpStore[key]; return res.status(400).json({ message: "OTP expired." }); }
    if (record.otp !== String(otp).trim()) return res.status(400).json({ message: "Incorrect OTP." });
    delete otpStore[key];
    res.json({ success: true, message: "OTP verified." });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// OTP LOGIN
router.post("/otp-login", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required." });
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    if (!result.rows.length) return res.status(404).json({ message: "No account found with this email." });
    const user = result.rows[0];
    const jwt  = require("jsonwebtoken");
    const token = jwt.sign({ id: user.id, role: user.role }, "secretkey", { expiresIn: "7d" });
    res.json({ token, user });
  } catch (e) { console.error("[otp-login]", e); res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

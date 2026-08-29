const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const { sendMail, templates } = require("../utils/mailer");

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// POST /api/email/send — generic send (boss only)
router.post("/send", async (req, res) => {
  const u = getUser(req);
  if (!u || u.role !== "boss") return res.status(403).json({ message: "Boss only" });
  const { to, subject, html, text } = req.body;
  try {
    const result = await sendMail({ to, subject, html, text });
    res.json(result);
  } catch (e) {
    console.log("Email error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// POST /api/email/deadline-warning — send deadline warnings for all projects
router.post("/deadline-warning", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ message: "Unauthorized" });
  const { projectName, daysLeft, deadline, recipientEmails } = req.body;
  try {
    const results = await Promise.allSettled(
      (recipientEmails || []).map(email => templates.deadlineWarning(email, projectName, daysLeft, deadline))
    );
    res.json({ sent: results.filter(r => r.status === "fulfilled").length, total: results.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/email/test — test email config
router.post("/test", async (req, res) => {
  const u = getUser(req);
  if (!u || u.role !== "boss") return res.status(403).json({ message: "Boss only" });
  try {
    const result = await sendMail({
      to: req.body.to || process.env.MAIL_USER,
      subject: "BuildCore — Email test",
      html: "<p>✅ Your BuildCore email is configured correctly!</p>",
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

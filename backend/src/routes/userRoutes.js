const express  = require("express");
const router   = express.Router();
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcrypt");
const upload   = require("../middleware/uploadMiddleware");
const pool     = require("../config/db");
const { templates } = require("../utils/mailer");

// helper: decode JWT from Authorization header
const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = jwt.verify(token, "secretkey");
    return decoded.id;
  } catch {
    return null;
  }
};

// POST /api/users/create-member — boss creates a new user with login credentials
router.post("/create-member", async (req, res) => {
  try {
    const requesterId = getUserId(req);
    if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

    // only boss can create members
    const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [requesterId]);
    if (requester.rows[0]?.role !== "boss") return res.status(403).json({ message: "Only managers can create members" });

    const { first_name, last_name, sex, dob, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    // check email uniqueness
    const existing = await pool.query(`SELECT id FROM users WHERE email=$1`, [email]);
    if (existing.rows.length > 0) return res.status(409).json({ message: "A user with this email already exists" });

    // generate username from email
    const name = email.split("@")[0];

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, first_name, last_name, sex, dob, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'offline')
       RETURNING id, name, email, role, first_name, last_name`,
      [name, email, hashed, role || "employee", first_name || null, last_name || null, sex || null, dob || null]
    );
    const newUser = result.rows[0];
    // Send welcome email (fire-and-forget — don't block response)
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || name;
    templates.memberCreated(email, fullName, email, password).catch(e => console.log("Welcome email:", e.message));
    res.json(newUser);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Ensure last_seen column exists (runs once on startup)
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ`)
  .catch(e => console.log("last_seen column:", e.message));

// GET ALL USERS — status auto-set to offline if last_seen > 5 min ago
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, first_name, last_name, profile_picture,
              CASE
                WHEN last_seen IS NULL OR last_seen < NOW() - INTERVAL '5 minutes'
                THEN 'offline'
                ELSE status
              END AS status,
              skills, phone
       FROM users
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.log(error.message);
  }
});

// GET SINGLE USER PROFILE (full details)
router.get("/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, email, role, first_name, last_name, sex, dob, profile_picture, phone
       FROM users
       WHERE id = $1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.log(error.message);
  }
});

// UPDATE OWN PROFILE (only the logged-in user can edit their own)
router.put("/:id/profile", upload.single("profile_picture"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (Number(id) !== userId) {
      // allow boss to edit anyone's profile
      const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [userId]);
      if (requester.rows[0]?.role !== "boss") {
        return res.status(403).json({ message: "Not authorized to edit this profile" });
      }
    }

    const { first_name, last_name, sex, dob, phone, email } = req.body;

    // If email is being changed, check uniqueness
    if (email) {
      const existing = await pool.query(`SELECT id FROM users WHERE email=$1 AND id!=$2`, [email.trim().toLowerCase(), id]);
      if (existing.rows.length > 0) return res.status(409).json({ message: "Another account already uses this email." });
    }

    let updated;
    if (req.file) {
      updated = await pool.query(
        `UPDATE users
         SET first_name=$1, last_name=$2, sex=$3, dob=$4, profile_picture=$5, phone=$6${email ? ", email=$8" : ""}
         WHERE id=$7
         RETURNING id, name, email, role, first_name, last_name, sex, dob, profile_picture, phone`,
        email
          ? [first_name || null, last_name || null, sex || null, dob || null, req.file.filename, phone || null, id, email.trim().toLowerCase()]
          : [first_name || null, last_name || null, sex || null, dob || null, req.file.filename, phone || null, id]
      );
    } else {
      updated = await pool.query(
        `UPDATE users
         SET first_name=$1, last_name=$2, sex=$3, dob=$4, phone=$5${email ? ", email=$7" : ""}
         WHERE id=$6
         RETURNING id, name, email, role, first_name, last_name, sex, dob, profile_picture, phone`,
        email
          ? [first_name || null, last_name || null, sex || null, dob || null, phone || null, id, email.trim().toLowerCase()]
          : [first_name || null, last_name || null, sex || null, dob || null, phone || null, id]
      );
    }

    res.json(updated.rows[0]);
  } catch (error) {
    console.log(error.message);
  }
});

// HEARTBEAT — called every 2 min by the frontend while user is active
router.put("/:id/heartbeat", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE users SET last_seen=NOW() WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (e) { console.log(e.message); res.sendStatus(500); }
});

// STATUS OFFLINE via sendBeacon (GET, token in query param — fires on tab/browser close)
router.get("/:id/status-offline", async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    if (!token) return res.sendStatus(204);
    try {
      const decoded = require("jsonwebtoken").verify(token, "secretkey");
      if (String(decoded.id) !== String(id)) return res.sendStatus(403);
    } catch { return res.sendStatus(401); }
    // Clear last_seen so they immediately show offline
    await pool.query(`UPDATE users SET status='offline', last_seen=NULL WHERE id=$1`, [id]);
    res.sendStatus(204);
  } catch (e) { console.log(e.message); res.sendStatus(500); }
});

// UPDATE STATUS
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["available", "working", "offline"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    // Update status and refresh last_seen so they don't immediately flip offline
    await pool.query(`UPDATE users SET status=$1, last_seen=NOW() WHERE id=$2`, [status, id]);
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE SKILLS
router.put("/:id/skills", async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = getUserId(req);
    if (!requesterId) return res.status(401).json({ message: "Unauthorized" });
    const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [requesterId]);
    if (requester.rows[0]?.role !== "boss") return res.status(403).json({ message: "Only managers can edit skills" });
    const { skills } = req.body;
    await pool.query(`UPDATE users SET skills=$1 WHERE id=$2`, [skills || "", id]);
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// CHANGE ROLE (boss only, enforced server-side)
const VALID_ROLES = ["boss", "manager", "engineer", "worker", "client"];
router.put("/:id/role", async (req, res) => {
  try {
    const requesterId = getUserId(req);
    if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

    const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [requesterId]);
    if (requester.rows[0]?.role !== "boss") return res.status(403).json({ message: "Only the boss can change roles" });

    const { id } = req.params;
    const { role } = req.body;
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ message: "Invalid role" });

    // Prevent demoting yourself (boss can't accidentally lose their own role)
    if (Number(id) === requesterId && role !== "boss") {
      return res.status(400).json({ message: "You cannot change your own role. Transfer boss to someone else first." });
    }

    // If promoting someone to boss, demote old boss to manager
    if (role === "boss") {
      await pool.query(`UPDATE users SET role='manager' WHERE id=$1`, [requesterId]);
    }

    await pool.query(`UPDATE users SET role=$1 WHERE id=$2`, [role, id]);
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
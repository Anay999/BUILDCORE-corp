const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

// Create table
pool.query(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_name VARCHAR(200),
    project_id INTEGER,
    project_name VARCHAR(200),
    meta JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("activity_log table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// GET all activity (paginated)
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const limit  = parseInt(req.query.limit)  || 50;
    const offset = parseInt(req.query.offset) || 0;
    const r = await pool.query(
      `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const count = await pool.query("SELECT COUNT(*) FROM activity_log");
    res.json({ logs: r.rows, total: parseInt(count.rows[0].count) });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET activity for a specific project
router.get("/project/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT * FROM activity_log WHERE project_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// POST log an activity
router.post("/", async (req, res) => {
  try {
    const { user_id, user_name, action, entity_type, entity_name, project_id, project_name, meta } = req.body;
    const r = await pool.query(
      `INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_name, project_id, project_name, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [user_id || null, user_name || null, action, entity_type || null, entity_name || null, project_id || null, project_name || null, meta ? JSON.stringify(meta) : null]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE all logs (boss only)
router.delete("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM activity_log");
    res.json({ message: "Cleared" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

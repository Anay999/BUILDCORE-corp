const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const jwt     = require("jsonwebtoken");

pool.query(`
  CREATE TABLE IF NOT EXISTS punch_list (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER NOT NULL,
    title        VARCHAR(300) NOT NULL,
    description  TEXT,
    location     VARCHAR(200),
    category     VARCHAR(50) NOT NULL DEFAULT 'General',
    severity     VARCHAR(20) NOT NULL DEFAULT 'medium',
    status       VARCHAR(20) NOT NULL DEFAULT 'open',
    raised_by    INTEGER NOT NULL,
    assigned_to  INTEGER,
    photo_url    TEXT,
    due_date     DATE,
    resolved_at  TIMESTAMP,
    resolved_by  INTEGER,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("punch_list table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// GET /api/punch-list/:projectId
router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT pl.*,
         u.name AS raised_by_name,
         a.name AS assigned_to_name,
         rv.name AS resolved_by_name
       FROM punch_list pl
       JOIN users u ON pl.raised_by = u.id
       LEFT JOIN users a  ON pl.assigned_to = a.id
       LEFT JOIN users rv ON pl.resolved_by  = rv.id
       WHERE pl.project_id = $1
       ORDER BY
         CASE pl.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
         CASE pl.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         pl.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/punch-list
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, title, description, location, category, severity, assigned_to, photo_url, due_date } = req.body;
    if (!project_id || !title) return res.status(400).json({ message: "project_id and title required" });
    const r = await pool.query(
      `INSERT INTO punch_list (project_id, title, description, location, category, severity, raised_by, assigned_to, photo_url, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [project_id, title, description||null, location||null,
       category||"General", severity||"medium", user.id,
       assigned_to||null, photo_url||null, due_date||null]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /api/punch-list/:id/status
router.patch("/:id/status", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { status } = req.body;
    if (!["open","in_progress","resolved"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const r = await pool.query(
      `UPDATE punch_list SET
         status = $1,
         resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE NULL END,
         resolved_by = CASE WHEN $1 = 'resolved' THEN $2 ELSE NULL END,
         updated_at  = NOW()
       WHERE id = $3 RETURNING *`,
      [status, user.id, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/punch-list/:id
router.delete("/:id", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM punch_list WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

pool.query(`
  CREATE TABLE IF NOT EXISTS daily_logs (
    id            SERIAL PRIMARY KEY,
    project_id    INTEGER NOT NULL,
    logged_by     INTEGER NOT NULL,
    log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    weather       VARCHAR(50) DEFAULT 'clear',
    workers_present INTEGER DEFAULT 0,
    work_done     TEXT NOT NULL,
    issues        TEXT,
    materials_used TEXT,
    next_day_plan TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, log_date, logged_by)
  )
`).catch(e => console.log("daily_logs table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// GET /api/daily-logs/:projectId  — all logs for a project
router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT dl.*, u.name AS logged_by_name, u.role AS logged_by_role
       FROM daily_logs dl
       JOIN users u ON dl.logged_by = u.id
       WHERE dl.project_id = $1
       ORDER BY dl.log_date DESC, dl.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET /api/daily-logs/company/recent  — latest log per project for dashboard feed
router.get("/company/recent", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT DISTINCT ON (dl.project_id)
         dl.*, u.name AS logged_by_name, p.title AS project_title
       FROM daily_logs dl
       JOIN users u ON dl.logged_by = u.id
       JOIN projects p ON dl.project_id = p.id
       ORDER BY dl.project_id, dl.log_date DESC, dl.created_at DESC
       LIMIT 20`
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/daily-logs
router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, logged_by, log_date, weather, workers_present, work_done, issues, materials_used, next_day_plan } = req.body;
    const r = await pool.query(
      `INSERT INTO daily_logs (project_id, logged_by, log_date, weather, workers_present, work_done, issues, materials_used, next_day_plan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (project_id, log_date, logged_by) DO UPDATE
         SET weather=$4, workers_present=$5, work_done=$6, issues=$7, materials_used=$8, next_day_plan=$9
       RETURNING *`,
      [project_id, logged_by, log_date || new Date().toISOString().split("T")[0],
       weather || "clear", workers_present || 0, work_done,
       issues || null, materials_used || null, next_day_plan || null]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/daily-logs/:id
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM daily_logs WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

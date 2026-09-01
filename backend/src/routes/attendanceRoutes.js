const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { broadcast } = require("../utils/broadcast");

pool.query(`
  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT NULL,
    note TEXT,
    clock_in  TIMESTAMP DEFAULT NULL,
    clock_out TIMESTAMP DEFAULT NULL,
    checked_in_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id, date)
  )
`).catch(() => {});

pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS clock_in TIMESTAMP DEFAULT NULL`).catch(()=>{});
pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS clock_out TIMESTAMP DEFAULT NULL`).catch(()=>{});
pool.query(`ALTER TABLE attendance ALTER COLUMN status DROP NOT NULL`).catch(()=>{});

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    return token ? jwt.verify(token, "secretkey") : null;
  } catch { return null; }
};

// GET /api/attendance — list all attendance records (with date/project filter)
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { date, project_id } = req.query;
    let q = `SELECT a.*, u.name as user_name, u.name, u.email, u.role, p.title as project_title 
             FROM attendance a 
             JOIN users u ON a.user_id = u.id 
             LEFT JOIN projects p ON a.project_id = p.id WHERE 1=1`;
    const params = [];
    if (date) { params.push(date); q += ` AND a.date = $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND a.project_id = $${params.length}`; }
    q += ` ORDER BY a.date DESC, a.clock_in DESC NULLS LAST, u.name`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { projectId } = req.params;
    const { date } = req.query;
    let q = `SELECT a.*, u.name, u.email, u.role FROM attendance a JOIN users u ON a.user_id = u.id WHERE a.project_id = $1`;
    const params = [projectId];
    if (date) { q += ` AND a.date = $2`; params.push(date); }
    q += ` ORDER BY a.date DESC, a.clock_in ASC NULLS LAST, u.name`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post("/clock-in", async (req, res) => {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, user_id } = req.body;
    const targetUserId = Number(user_id || authUser.id);
    const targetProjectId = Number(project_id);
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const h = now.getHours(), m = now.getMinutes();
    const autoStatus = (h < 9 || (h === 9 && m <= 30)) ? "present" : "late";
    const r = await pool.query(
      `INSERT INTO attendance (project_id, user_id, date, status, clock_in)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (project_id, user_id, date) DO UPDATE
         SET clock_in = CASE WHEN attendance.clock_in IS NULL THEN $5 ELSE attendance.clock_in END,
             status   = CASE WHEN attendance.status IS NULL THEN $4 ELSE attendance.status END
       RETURNING *`,
      [targetProjectId, targetUserId, date, autoStatus, now]
    );
    broadcast("attendance_update", { action: "clock-in", project_id: targetProjectId, user_id: targetUserId, status: autoStatus });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post("/clock-out", async (req, res) => {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, user_id } = req.body;
    const targetUserId = Number(user_id || authUser.id);
    const targetProjectId = Number(project_id);
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const r = await pool.query(
      `INSERT INTO attendance (project_id, user_id, date, clock_out)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (project_id, user_id, date) DO UPDATE SET clock_out = $4
       RETURNING *`,
      [targetProjectId, targetUserId, date, now]
    );
    broadcast("attendance_update", { action: "clock-out", project_id: targetProjectId, user_id: targetUserId });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, user_id, date, status, note } = req.body;
    const d = date || new Date().toISOString().split("T")[0];
    const r = await pool.query(
      `INSERT INTO attendance (project_id, user_id, date, status, note)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (project_id, user_id, date) DO UPDATE SET status=$4, note=$5, checked_in_at=NOW()
       RETURNING *`,
      [project_id, user_id, d, status || "present", note || null]
    );
    broadcast("attendance_update", { action: "mark", project_id, user_id, status: status || "present" });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM attendance WHERE id=$1", [req.params.id]);
    broadcast("attendance_update", { action: "delete", id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

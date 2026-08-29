const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const jwt     = require("jsonwebtoken");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    return token ? jwt.verify(token, "secretkey").id : null;
  } catch { return null; }
};

pool.query(`
  CREATE TABLE IF NOT EXISTS equipment (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    type          TEXT,
    status        TEXT DEFAULT 'available',
    project_id    INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    assigned_date DATE,
    return_date   DATE,
    maintenance_due DATE,
    daily_cost    NUMERIC(12,2) DEFAULT 0,
    notes         TEXT,
    created_by    INTEGER REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.error("equipment table error:", e.message));

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(`
      SELECT e.*, p.title AS project_title, u.name AS created_by_name
      FROM equipment e
      LEFT JOIN projects p ON p.id = e.project_id
      LEFT JOIN users u ON u.id = e.created_by
      ORDER BY e.created_at DESC
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { name, type, status, project_id, assigned_date, return_date, maintenance_due, daily_cost, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
  try {
    const r = await pool.query(
      `INSERT INTO equipment (name, type, status, project_id, assigned_date, return_date, maintenance_due, daily_cost, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name.trim(), type||null, status||"available", project_id||null,
       assigned_date||null, return_date||null, maintenance_due||null,
       parseFloat(daily_cost)||0, notes||null, userId]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { status, project_id, maintenance_due, notes, return_date, assigned_date } = req.body;
  try {
    const resolvedAssigned = status === "deployed"
      ? (assigned_date || new Date().toISOString().split("T")[0]) : null;
    const resolvedProject  = ["available","maintenance","retired"].includes(status)
      ? null : (project_id || null);
    const resolvedReturn   = status === "available"
      ? new Date().toISOString().split("T")[0] : (return_date || null);

    await pool.query(
      `UPDATE equipment SET
        status          = COALESCE($1, status),
        project_id      = $2,
        maintenance_due = COALESCE($3, maintenance_due),
        notes           = COALESCE($4, notes),
        return_date     = $5,
        assigned_date   = $6
       WHERE id = $7`,
      [status, resolvedProject, maintenance_due||null, notes||null,
       resolvedReturn, resolvedAssigned, req.params.id]
    );
    const r = await pool.query(
      `SELECT e.*, p.title AS project_title
       FROM equipment e LEFT JOIN projects p ON p.id=e.project_id WHERE e.id=$1`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log("equip patch:", e.message); res.status(500).json({ message: e.message }); }
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM equipment WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

pool.query(`
  CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    added_by INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    gst_pct NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("expenses table:", e.message));
// Add gst_pct if missing
pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS gst_pct NUMERIC(5,2) DEFAULT 0`).catch(()=>{});

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT e.*, u.name as added_by_name FROM expenses e
       JOIN users u ON e.added_by = u.id
       WHERE e.project_id = $1 ORDER BY e.date DESC, e.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, added_by, category, description, amount, date, gst_pct } = req.body;
    const r = await pool.query(
      "INSERT INTO expenses (project_id, added_by, category, description, amount, date, gst_pct) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [project_id, added_by, category, description || null, amount, date || new Date().toISOString().split("T")[0], gst_pct || 0]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM expenses WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

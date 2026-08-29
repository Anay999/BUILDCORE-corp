const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

pool.query(`
  CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("milestones table:", e.message));

// Add start_date column if it doesn't exist yet
pool.query(`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS start_date DATE`)
  .catch(e => console.log("milestones start_date:", e.message));

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
      "SELECT * FROM milestones WHERE project_id = $1 ORDER BY due_date ASC NULLS LAST, created_at ASC",
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, title, description, due_date, start_date } = req.body;
    const r = await pool.query(
      "INSERT INTO milestones (project_id, title, description, due_date, start_date) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [project_id, title, description || null, due_date || null, start_date || null]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /:id/dates — update start_date + due_date (used by Gantt drag)
router.patch("/:id/dates", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { start_date, due_date } = req.body;
    const r = await pool.query(
      "UPDATE milestones SET start_date=$1, due_date=$2 WHERE id=$3 RETURNING *",
      [start_date || null, due_date || null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

router.put("/:id/toggle", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `UPDATE milestones SET completed = NOT completed,
       completed_at = CASE WHEN NOT completed THEN NOW() ELSE NULL END
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM milestones WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

pool.query(`
  CREATE TABLE IF NOT EXISTS project_templates (
    id          SERIAL PRIMARY KEY,
    created_by  INTEGER NOT NULL,
    name        VARCHAR(300) NOT NULL,
    description TEXT,
    tasks_json  JSONB DEFAULT '[]',
    milestones_json JSONB DEFAULT '[]',
    budget_categories_json JSONB DEFAULT '[]',
    created_at  TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("project_templates:", e.message));

// GET /api/project-templates
router.get("/", async (req, res) => {
  const u = getUser(req);
  if (!u || !["boss","manager"].includes(u.role)) return res.status(403).json({ error: "Forbidden" });
  try {
    const r = await pool.query(
      `SELECT pt.*, us.name AS creator_name FROM project_templates pt
       JOIN users us ON us.id = pt.created_by ORDER BY pt.created_at DESC`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/project-templates — save template from project
router.post("/", async (req, res) => {
  const u = getUser(req);
  if (!u || !["boss","manager"].includes(u.role)) return res.status(403).json({ error: "Forbidden" });
  const { name, description, tasks_json, milestones_json, budget_categories_json } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Template name required" });
  try {
    const r = await pool.query(
      `INSERT INTO project_templates (created_by, name, description, tasks_json, milestones_json, budget_categories_json)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [u.id, name.trim(), description || null,
       JSON.stringify(tasks_json || []),
       JSON.stringify(milestones_json || []),
       JSON.stringify(budget_categories_json || [])]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/project-templates/:id
router.delete("/:id", async (req, res) => {
  const u = getUser(req);
  if (!u || !["boss","manager"].includes(u.role)) return res.status(403).json({ error: "Forbidden" });
  try {
    await pool.query(`DELETE FROM project_templates WHERE id=$1 AND created_by=$2`, [req.params.id, u.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const jwt     = require("jsonwebtoken");

pool.query(`
  CREATE TABLE IF NOT EXISTS issues (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER NOT NULL,
    reported_by  INTEGER NOT NULL,
    type         VARCHAR(50)  NOT NULL DEFAULT 'General',
    priority     VARCHAR(20)  NOT NULL DEFAULT 'medium',
    title        VARCHAR(300) NOT NULL,
    description  TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'open',
    photo_url    TEXT,
    resolved_at  TIMESTAMP,
    resolved_by  INTEGER,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("issues table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// GET /api/issues  — all issues (cross-project, optional ?project_id=)
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, status, type, priority } = req.query;
    let q = `SELECT i.*, u.name AS reported_by_name, u.role AS reported_by_role,
               rv.name AS resolved_by_name, p.title AS project_title
             FROM issues i
             JOIN users u ON i.reported_by = u.id
             LEFT JOIN users rv ON i.resolved_by = rv.id
             JOIN projects p ON i.project_id = p.id
             WHERE 1=1`;
    const params = [];
    if (project_id) { params.push(project_id); q += ` AND i.project_id = $${params.length}`; }
    if (status)     { params.push(status);     q += ` AND i.status = $${params.length}`; }
    if (type)       { params.push(type);       q += ` AND i.type = $${params.length}`; }
    if (priority)   { params.push(priority);   q += ` AND i.priority = $${params.length}`; }
    q += ` ORDER BY CASE i.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.created_at DESC`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET /api/issues/:projectId  — issues for one project
router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT i.*, u.name AS reported_by_name, rv.name AS resolved_by_name, p.title AS project_title
       FROM issues i
       JOIN users u ON i.reported_by = u.id
       LEFT JOIN users rv ON i.resolved_by = rv.id
       JOIN projects p ON i.project_id = p.id
       WHERE i.project_id = $1
       ORDER BY CASE i.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

const eventsRouter = require("./eventsRoutes");

// POST /api/issues
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, type, category, priority, title, description, photo_url } = req.body;
    if (!project_id || !title) return res.status(400).json({ message: "project_id and title required" });
    const issueType = type || category || "General";
    const r = await pool.query(
      `INSERT INTO issues (project_id, reported_by, type, priority, title, description, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id, user.id, issueType, priority || "medium", title, description || null, photo_url || null]
    );
    const createdIssue = r.rows[0];
    eventsRouter.broadcast("issue_update", { action: "create", issue: createdIssue });
    res.json(createdIssue);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /api/issues/:id/status
router.patch("/:id/status", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { status } = req.body;
    if (!["open","in_progress","resolved"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const r = await pool.query(
      `UPDATE issues SET
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

// DELETE /api/issues/:id
router.delete("/:id", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM issues WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// Auto-create rfis table
pool.query(`
  CREATE TABLE IF NOT EXISTS rfis (
    id            SERIAL PRIMARY KEY,
    project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    status        TEXT NOT NULL DEFAULT 'open',
    priority      TEXT NOT NULL DEFAULT 'medium',
    raised_by     INTEGER REFERENCES users(id),
    assigned_to   INTEGER REFERENCES users(id),
    due_date      DATE,
    response      TEXT,
    responded_by  INTEGER REFERENCES users(id),
    responded_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => console.log("RFI table:", e.message));

// GET /api/rfi/:projectId
router.get("/:projectId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT r.*,
              u1.name AS raised_by_name,
              u2.name AS assigned_to_name,
              u3.name AS responded_by_name
       FROM rfis r
       LEFT JOIN users u1 ON u1.id = r.raised_by
       LEFT JOIN users u2 ON u2.id = r.assigned_to
       LEFT JOIN users u3 ON u3.id = r.responded_by
       WHERE r.project_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/rfi
router.post("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { project_id, title, description, priority, assigned_to, due_date } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO rfis (project_id, title, description, priority, assigned_to, due_date, raised_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id, title, description || null, priority || "medium", assigned_to || null, due_date || null, userId]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/rfi/:id — update status, response, or fields
router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { status, response, priority, assigned_to, due_date, title, description } = req.body;
  try {
    const fields = [];
    const vals   = [];
    let idx = 1;
    if (title       !== undefined) { fields.push(`title=$${idx++}`);       vals.push(title); }
    if (description !== undefined) { fields.push(`description=$${idx++}`); vals.push(description); }
    if (priority    !== undefined) { fields.push(`priority=$${idx++}`);    vals.push(priority); }
    if (assigned_to !== undefined) { fields.push(`assigned_to=$${idx++}`); vals.push(assigned_to); }
    if (due_date    !== undefined) { fields.push(`due_date=$${idx++}`);    vals.push(due_date); }
    if (status      !== undefined) { fields.push(`status=$${idx++}`);      vals.push(status); }
    if (response    !== undefined) {
      fields.push(`response=$${idx++}`, `responded_by=$${idx++}`, `responded_at=NOW()`, `status='closed'`);
      vals.push(response, userId);
    }
    fields.push(`updated_at=NOW()`);
    vals.push(req.params.id);
    const r = await pool.query(
      `UPDATE rfis SET ${fields.join(",")} WHERE id=$${idx} RETURNING *`,
      vals
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/rfi/:id
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM rfis WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const jwt     = require("jsonwebtoken");

// Auto-create table
pool.query(`
  CREATE TABLE IF NOT EXISTS project_requests (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER NOT NULL,
    client_name  VARCHAR(200),
    client_email VARCHAR(200),
    phone        VARCHAR(30),
    title        VARCHAR(300) NOT NULL,
    location     VARCHAR(300) NOT NULL,
    budget       NUMERIC(15,2),
    description  TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by  INTEGER,
    review_note  TEXT,
    reviewed_at  TIMESTAMP,
    created_at   TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("project_requests table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// POST — client submits a project request
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { title, location, budget, description, phone } = req.body;
  if (!title || !location || !description) return res.status(400).json({ error: "Missing required fields" });
  try {
    // JWT only carries id+role — look up real name/email from DB
    const uRow = await pool.query(`SELECT name, email FROM users WHERE id=$1`, [user.id]);
    const clientName  = uRow.rows[0]?.name  || null;
    const clientEmail = uRow.rows[0]?.email || null;

    const r = await pool.query(
      `INSERT INTO project_requests (client_id, client_name, client_email, phone, title, location, budget, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [user.id, clientName, clientEmail, phone || null, title, location, budget || null, description]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error("project_requests POST:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET — boss/manager views all requests (JOIN users so name/email always populated)
router.get("/", async (req, res) => {
  const user = getUser(req);
  if (!user || !["boss", "manager"].includes(user.role))
    return res.status(403).json({ error: "Forbidden" });
  try {
    const r = await pool.query(`
      SELECT pr.*,
             COALESCE(pr.client_name,  u.name)  AS client_name,
             COALESCE(pr.client_email, u.email) AS client_email
      FROM   project_requests pr
      LEFT   JOIN users u ON u.id = pr.client_id
      ORDER  BY pr.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id — approve or decline
router.patch("/:id", async (req, res) => {
  const user = getUser(req);
  if (!user || !["boss", "manager"].includes(user.role))
    return res.status(403).json({ error: "Forbidden" });
  const { status, review_note } = req.body;
  if (!["approved", "declined"].includes(status))
    return res.status(400).json({ error: "status must be approved or declined" });
  try {
    const r = await pool.query(
      `UPDATE project_requests
       SET status=$1, review_note=$2, reviewed_by=$3, reviewed_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, review_note || null, user.id, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clear?status=pending|approved|declined — boss/manager bulk clear
router.delete("/clear", async (req, res) => {
  const user = getUser(req);
  if (!user || !["boss", "manager"].includes(user.role))
    return res.status(403).json({ error: "Forbidden" });
  const { status } = req.query;
  if (!["pending", "approved", "declined"].includes(status))
    return res.status(400).json({ error: "status must be pending, approved, or declined" });
  try {
    const r = await pool.query(
      `DELETE FROM project_requests WHERE status=$1 RETURNING id`,
      [status]
    );
    res.json({ deleted: r.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

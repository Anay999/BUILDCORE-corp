const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const jwt     = require("jsonwebtoken");
const { broadcast } = require("../utils/broadcast");

pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50)  NOT NULL DEFAULT 'info',
    title       TEXT         NOT NULL,
    body        TEXT,
    link_page   VARCHAR(50),
    link_id     INTEGER,
    is_read     BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
  )
`).catch(e => console.log("notifications table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// Helper exported so other routes can create notifications
const createNotification = async (userId, type, title, body, linkPage, linkId) => {
  try {
    const r = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link_page, link_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [userId, type, title, body || null, linkPage || null, linkId || null]
    );
    // Push live update to that user via SSE
    broadcast("notification", { user_id: userId, notification: r.rows[0] });
    return r.rows[0];
  } catch (e) { console.log("createNotification error:", e.message); }
};
router.createNotification = createNotification;

// GET /api/notifications  — current user's notifications
router.get("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [user.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`, [req.params.id, user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1`, [user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/notifications/clear-all  — MUST be before /:id so Express doesn't swallow it
router.delete("/clear-all", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM notifications WHERE user_id=$1`, [user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/notifications/:id
router.delete("/:id", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM notifications WHERE id=$1 AND user_id=$2`, [req.params.id, user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

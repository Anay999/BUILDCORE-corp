const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");
const path    = require("path");
const multer  = require("multer");
const eventsRouter = require("./eventsRoutes");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// Multer — accept images, videos, docs, no size cap on type
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads/")),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200 MB

// ── SPECIFIC routes FIRST (before wildcard /:userId) ──────────────────────

// POST /upload — upload image / video / doc
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const isVideo = req.file.mimetype?.startsWith("video/");
  res.json({ filename: req.file.filename, type: isVideo ? "video" : "file" });
});

// POST / — send a text message
router.post("/", async (req, res) => {
  const senderId = getUserId(req);
  if (!senderId) return res.status(401).json({ message: "Unauthorized" });
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content?.trim()) return res.status(400).json({ message: "Missing fields" });
  try {
    const friendCheck = await pool.query(
      `SELECT id FROM friend_requests
       WHERE ((sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1))
         AND status='accepted'`,
      [senderId, receiver_id]
    );
    if (friendCheck.rows.length === 0) return res.status(403).json({ message: "Not connected" });
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3)
       RETURNING id, sender_id, receiver_id, content, created_at`,
      [senderId, receiver_id, content.trim()]
    );
    const msg = result.rows[0];
    eventsRouter.broadcast("chat_message", { friend_id: receiver_id, sender_id: senderId, msg });
    res.json(msg);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /read/:userId — mark all messages from userId as read
router.patch("/read/:userId", async (req, res) => {
  const myId = getUserId(req);
  if (!myId) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`);
    await pool.query(
      `UPDATE messages SET read_at=NOW() WHERE sender_id=$1 AND receiver_id=$2 AND read_at IS NULL`,
      [req.params.userId, myId]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /reactions/:msgId — fetch reactions for a message
router.get("/reactions/:msgId", async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS message_reactions (
      id SERIAL PRIMARY KEY, message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL, user_name VARCHAR(200), emoji VARCHAR(10) NOT NULL,
      UNIQUE(message_id, user_id))`);
    const r = await pool.query(
      `SELECT emoji, user_id, user_name FROM message_reactions WHERE message_id=$1`,
      [req.params.msgId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /reactions — toggle a reaction
router.post("/reactions", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { message_id, emoji } = req.body;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS message_reactions (
      id SERIAL PRIMARY KEY, message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL, user_name VARCHAR(200), emoji VARCHAR(10) NOT NULL,
      UNIQUE(message_id, user_id))`);
    const uRow = await pool.query(`SELECT name FROM users WHERE id=$1`, [userId]);
    const userName = uRow.rows[0]?.name || "User";
    const ex = await pool.query(
      `SELECT id, emoji FROM message_reactions WHERE message_id=$1 AND user_id=$2`,
      [message_id, userId]
    );
    if (ex.rows.length > 0) {
      if (ex.rows[0].emoji === emoji) {
        await pool.query(`DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2`, [message_id, userId]);
        return res.json({ action: "removed" });
      }
      await pool.query(
        `UPDATE message_reactions SET emoji=$1, user_name=$2 WHERE message_id=$3 AND user_id=$4`,
        [emoji, userName, message_id, userId]
      );
      return res.json({ action: "updated" });
    }
    await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, user_name, emoji) VALUES ($1,$2,$3,$4)`,
      [message_id, userId, userName, emoji]
    );
    res.json({ action: "added" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/messages/pin/:messageId
router.delete("/pin/:messageId", async (req, res) => {
  const myId = getUserId(req);
  if (!myId) return res.status(401).json({ message: "Unauthorized" });
  await ensurePinnedTable();
  try {
    await pool.query(`DELETE FROM pinned_messages WHERE message_id=$1`, [req.params.messageId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// DELETE /:id — unsend own message
router.delete("/:id", async (req, res) => {
  const senderId = getUserId(req);
  if (!senderId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `DELETE FROM messages WHERE id=$1 AND sender_id=$2 RETURNING id`,
      [req.params.id, senderId]
    );
    if (!result.rows[0]) return res.status(403).json({ message: "Not your message" });
    res.json({ success: true });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// ── Pinned messages ────────────────────────────────────────────────────────
// Auto-create pinned_messages table
const ensurePinnedTable = () => pool.query(`
  CREATE TABLE IF NOT EXISTS pinned_messages (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    pinned_by INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id)
  )
`).catch(() => {});

// GET /api/messages/pinned/:friendId
router.get("/pinned/:friendId", async (req, res) => {
  const myId = getUserId(req);
  if (!myId) return res.status(401).json({ message: "Unauthorized" });
  await ensurePinnedTable();
  try {
    const otherId = Number(req.params.friendId);
    if (isNaN(otherId)) return res.json([]);
    const r = await pool.query(`
      SELECT pm.id AS pin_id, m.id, m.content, m.created_at, u.name AS sender_name
      FROM pinned_messages pm
      JOIN messages m ON m.id = pm.message_id
      JOIN users u ON u.id = m.sender_id
      WHERE pm.friend_id = $1 AND (
        (m.sender_id=$2 AND m.receiver_id=$3) OR (m.sender_id=$3 AND m.receiver_id=$2)
      )
      ORDER BY pm.created_at DESC
    `, [otherId, myId, otherId]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST /api/messages/pin
router.post("/pin", async (req, res) => {
  const myId = getUserId(req);
  if (!myId) return res.status(401).json({ message: "Unauthorized" });
  await ensurePinnedTable();
  const { message_id } = req.body;
  try {
    const msg = await pool.query(`SELECT sender_id, receiver_id FROM messages WHERE id=$1`, [message_id]);
    if (!msg.rows[0]) return res.status(404).json({ message: "Message not found" });
    const { sender_id, receiver_id } = msg.rows[0];
    const friendId = sender_id === myId ? receiver_id : sender_id;
    await pool.query(
      `INSERT INTO pinned_messages (message_id, pinned_by, friend_id) VALUES ($1,$2,$3) ON CONFLICT (message_id) DO NOTHING`,
      [message_id, myId, friendId]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});
// ── WILDCARD last — must be after all specific routes ─────────────────────

// GET /:userId — fetch conversation between me and another user
router.get("/:userId", async (req, res) => {
  const myId = getUserId(req);
  if (!myId) return res.status(401).json({ message: "Unauthorized" });
  const otherId = Number(req.params.userId);
  if (isNaN(otherId)) return res.status(400).json({ message: "Invalid user id" });
  try {
    const result = await pool.query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at, m.read_at,
              u.name AS sender_name, u.profile_picture AS sender_pic
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id=$1 AND m.receiver_id=$2)
          OR (m.sender_id=$2 AND m.receiver_id=$1)
       ORDER BY m.created_at ASC`,
      [myId, otherId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

module.exports = router;
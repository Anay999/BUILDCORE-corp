const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");
const eventsRouter = require("./eventsRoutes");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// GET /api/project-chat/:projectId
router.get("/:projectId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `SELECT pc.id, pc.project_id, pc.content, pc.created_at, pc.user_id,
              u.name, u.profile_picture, u.role
       FROM project_chat pc
       JOIN users u ON u.id = pc.user_id
       WHERE pc.project_id = $1
       ORDER BY pc.created_at ASC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/project-chat
router.post("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { project_id, content } = req.body;
  if (!project_id || !content?.trim()) return res.status(400).json({ message: "Missing fields" });
  try {
    const result = await pool.query(
      `INSERT INTO project_chat (project_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [project_id, userId, content.trim()]
    );
    const msg = result.rows[0];
    const sender = await pool.query(`SELECT name, profile_picture, role FROM users WHERE id=$1`, [userId]);
    const fullMsg = { ...msg, ...sender.rows[0] };
    eventsRouter.broadcast("chat_message", { project_id, friend_id: null, msg: fullMsg });
    res.json(fullMsg);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/project-chat/:id  (own message or boss)
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const msg = await pool.query(`SELECT user_id FROM project_chat WHERE id=$1`, [req.params.id]);
    if (!msg.rows[0]) return res.status(404).json({ message: "Message not found" });
    const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [userId]);
    if (msg.rows[0].user_id !== userId && requester.rows[0]?.role !== "boss") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await pool.query(`DELETE FROM project_chat WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

module.exports = router;
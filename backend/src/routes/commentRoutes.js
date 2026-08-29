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

// GET /api/comments/:taskId
router.get("/:taskId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `SELECT c.id, c.task_id, c.content, c.created_at, c.user_id,
              u.name, u.profile_picture, u.role
       FROM task_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.taskId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/comments
router.post("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { task_id, content } = req.body;
  if (!task_id || !content?.trim()) return res.status(400).json({ message: "Missing fields" });
  try {
    const result = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [task_id, userId, content.trim()]
    );
    const comment = result.rows[0];
    const sender = await pool.query(`SELECT name, profile_picture, role FROM users WHERE id=$1`, [userId]);
    res.json({ ...comment, ...sender.rows[0] });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/comments/:id  (own comment or boss)
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const comment = await pool.query(`SELECT user_id FROM task_comments WHERE id=$1`, [req.params.id]);
    if (!comment.rows[0]) return res.status(404).json({ message: "Comment not found" });
    const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [userId]);
    if (comment.rows[0].user_id !== userId && requester.rows[0]?.role !== "boss") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await pool.query(`DELETE FROM task_comments WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

module.exports = router;
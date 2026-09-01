const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// GET /api/friends — accepted friends of current user
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.first_name, u.last_name, u.profile_picture,
              fr.id AS request_id
       FROM friend_requests fr
       JOIN users u ON u.id = CASE WHEN fr.sender_id = $1 THEN fr.receiver_id ELSE fr.sender_id END
       WHERE (fr.sender_id = $1 OR fr.receiver_id = $1) AND fr.status = 'accepted'`,
      [userId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET /api/friends/requests/incoming — pending requests sent TO me
router.get("/requests/incoming", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `SELECT fr.id, fr.sender_id, fr.created_at,
              u.name, u.email, u.role, u.first_name, u.last_name, u.profile_picture
       FROM friend_requests fr
       JOIN users u ON u.id = fr.sender_id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET /api/friends/requests/outgoing — pending requests I sent
router.get("/requests/outgoing", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `SELECT fr.id, fr.receiver_id, fr.status
       FROM friend_requests fr
       WHERE fr.sender_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

const eventsRouter = require("./eventsRoutes");

// POST /api/friends/request — send a friend request
router.post("/request", async (req, res) => {
  const senderId = getUserId(req);
  if (!senderId) return res.status(401).json({ message: "Unauthorized" });
  const { receiver_id } = req.body;
  if (!receiver_id || receiver_id === senderId) return res.status(400).json({ message: "Invalid receiver" });
  try {
    // check if already exists
    const existing = await pool.query(
      `SELECT id, status FROM friend_requests
       WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)`,
      [senderId, receiver_id]
    );
    if (existing.rows.length > 0) return res.status(409).json({ message: "Request already exists", status: existing.rows[0].status });
    const result = await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') RETURNING *`,
      [senderId, receiver_id]
    );
    eventsRouter.broadcast("friend_update", { action: "request", sender_id: senderId, receiver_id });
    res.json(result.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PUT /api/friends/requests/:id/accept
router.put("/requests/:id/accept", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `UPDATE friend_requests SET status='accepted' WHERE id=$1 AND receiver_id=$2 RETURNING *`,
      [req.params.id, userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Request not found" });
    eventsRouter.broadcast("friend_update", { action: "accept", request_id: req.params.id, receiver_id: userId, sender_id: result.rows[0].sender_id });
    res.json(result.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PUT /api/friends/requests/:id/decline
router.put("/requests/:id/decline", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(
      `UPDATE friend_requests SET status='declined' WHERE id=$1 AND receiver_id=$2`,
      [req.params.id, userId]
    );
    eventsRouter.broadcast("friend_update", { action: "decline", request_id: req.params.id, receiver_id: userId });
    res.json({ success: true });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

module.exports = router;
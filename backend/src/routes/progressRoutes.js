const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const multer  = require("multer");
const path    = require("path");
const pool    = require("../config/db");
const eventsRouter = require("./eventsRoutes");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// multer — accepts images, videos, and documents, up to 20 files × 50 MB each
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },  // 50 MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif|webp|mp4|mov|webm|avi|pdf|doc|docx|xls|xlsx|txt|csv|zip/i;
    const ext = path.extname(file.originalname).replace(".", "");
    allowed.test(ext) ? cb(null, true) : cb(new Error("File type not allowed"));
  },
});

// GET /api/progress/:projectId
router.get("/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pu.id, pu.project_id, pu.note, pu.image, pu.attachments, pu.user_id, pu.created_at,
              u.name AS uploader_name
       FROM progress_updates pu
       LEFT JOIN users u ON pu.user_id = u.id
       WHERE pu.project_id = $1
       ORDER BY pu.created_at DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/progress  — multi-file upload
router.post("/", upload.array("files", 20), async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { project_id, note } = req.body;
  if (!project_id || !note?.trim()) return res.status(400).json({ message: "Missing fields" });
  try {
    const filenames   = (req.files || []).map(f => f.filename);
    const attachments = JSON.stringify(filenames);
    // keep legacy `image` column pointing at first image for backward compat
    const firstImg    = filenames.find(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f)) || "";
    const result = await pool.query(
      `INSERT INTO progress_updates (project_id, note, image, attachments, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [project_id, note.trim(), firstImg, attachments, userId]
    );
    const row = result.rows[0];
    const sender = await pool.query(`SELECT name FROM users WHERE id=$1`, [userId]);
    const fullRow = { ...row, uploader_name: sender.rows[0]?.name };
    eventsRouter.broadcast("progress_update", { project_id });
    res.json(fullRow);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PUT /api/progress/:id  — edit note only (no re-upload on edit)
router.put("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const existing = await pool.query(`SELECT * FROM progress_updates WHERE id=$1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ message: "Not found" });
    if (existing.rows[0].user_id !== userId) return res.status(403).json({ message: "Not authorized" });
    const { note } = req.body;
    const updated = await pool.query(
      `UPDATE progress_updates SET note=$1 WHERE id=$2 RETURNING *`,
      [note, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/progress/:id  (boss only)
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM progress_updates WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

module.exports = router;
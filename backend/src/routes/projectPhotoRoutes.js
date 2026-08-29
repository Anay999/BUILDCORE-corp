const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");
const multer  = require("multer");
const path    = require("path");

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads/")),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

pool.query(`
  CREATE TABLE IF NOT EXISTS project_photos (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    filename    VARCHAR(300) NOT NULL,
    caption     TEXT,
    location    VARCHAR(200),
    taken_at    DATE DEFAULT CURRENT_DATE,
    created_at  TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("project_photos:", e.message));

// GET /api/project-photos/:projectId
router.get("/:projectId", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT pp.*, us.name AS uploader_name FROM project_photos pp
       JOIN users us ON us.id = pp.user_id
       WHERE pp.project_id=$1 ORDER BY pp.taken_at DESC, pp.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/project-photos — upload photo
router.post("/", upload.single("photo"), async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const { project_id, caption, location, taken_at } = req.body;
  if (!project_id) return res.status(400).json({ error: "project_id required" });
  try {
    const r = await pool.query(
      `INSERT INTO project_photos (project_id, user_id, filename, caption, location, taken_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [project_id, u.id, req.file.filename, caption || null, location || null, taken_at || new Date().toISOString().split("T")[0]]
    );
    const row = r.rows[0];
    const nameR = await pool.query(`SELECT name FROM users WHERE id=$1`, [u.id]);
    res.json({ ...row, uploader_name: nameR.rows[0]?.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/project-photos/:id
router.delete("/:id", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  try {
    const photo = await pool.query(`SELECT user_id FROM project_photos WHERE id=$1`, [req.params.id]);
    if (!photo.rows[0]) return res.status(404).json({ error: "Not found" });
    if (photo.rows[0].user_id !== u.id && !["boss","manager"].includes(u.role))
      return res.status(403).json({ error: "Forbidden" });
    await pool.query(`DELETE FROM project_photos WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

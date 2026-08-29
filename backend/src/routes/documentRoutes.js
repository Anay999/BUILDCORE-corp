const express  = require("express");
const router   = express.Router();
const jwt      = require("jsonwebtoken");
const pool     = require("../config/db");
const multer   = require("multer");
const path     = require("path");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// multer storage for documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|png|jpg|jpeg|gif|zip|txt|csv/i;
    const ext = path.extname(file.originalname).replace(".", "");
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

// ── Versioning table setup ───────────────────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS document_versions (
    id            SERIAL PRIMARY KEY,
    document_id   INTEGER NOT NULL,
    version_num   INTEGER NOT NULL DEFAULT 1,
    filename      VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    file_type     VARCHAR(50),
    file_size     INTEGER,
    uploaded_by   INTEGER,
    change_note   TEXT,
    created_at    TIMESTAMP DEFAULT NOW()
  );
  ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS version_num INTEGER DEFAULT 1;
  ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;
  ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
`).catch(e => console.log("document_versions table:", e.message));

// ── GET /api/documents/:projectId ────────────────────────────────────────────
router.get("/:projectId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `SELECT d.id, d.project_id, d.filename, d.original_name, d.file_type, d.created_at,
              u.name AS uploader_name
       FROM project_documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.project_id = $1
       ORDER BY d.created_at DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/documents
router.post("/", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      console.log("Multer error:", err.message);
      return res.status(400).json({ message: err.message });
    }
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { project_id } = req.body;
    if (!project_id) return res.status(400).json({ message: "Missing project_id" });
    try {
      const ext = path.extname(req.file.originalname).replace(".", "").toLowerCase();
      const result = await pool.query(
        `INSERT INTO project_documents (project_id, filename, original_name, file_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [project_id, req.file.filename, req.file.originalname, ext, userId]
      );
      const doc = result.rows[0];
      const uploader = await pool.query(`SELECT name FROM users WHERE id=$1`, [userId]);
      res.json({ ...doc, uploader_name: uploader.rows[0]?.name });
    } catch (e) { console.log("DB error:", e.message); res.status(500).json({ message: e.message }); }
  });
});

// ── GET /api/documents/versions/:docId — list all versions ──────────────────
router.get("/versions/:docId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(`
      SELECT dv.*, u.name AS uploader_name
      FROM document_versions dv
      LEFT JOIN users u ON u.id = dv.uploaded_by
      WHERE dv.document_id = $1
      ORDER BY dv.version_num DESC
    `, [req.params.docId]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/documents/versions/:docId — upload new version ─────────────────
router.post("/versions/:docId", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      // Get current version number
      const docR = await pool.query(`SELECT * FROM project_documents WHERE id=$1`, [req.params.docId]);
      if (!docR.rows[0]) return res.status(404).json({ message: "Document not found" });
      const currentVersion = docR.rows[0].version_num || 1;
      const newVersion     = currentVersion + 1;
      const ext = path.extname(req.file.originalname).replace(".", "").toLowerCase();

      // Archive current version into document_versions
      await pool.query(`
        INSERT INTO document_versions (document_id, version_num, filename, original_name, file_type, uploaded_by, change_note)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [req.params.docId, currentVersion, docR.rows[0].filename, docR.rows[0].original_name,
          docR.rows[0].file_type, userId, req.body.change_note || null]);

      // Update main document record with new file
      const updated = await pool.query(`
        UPDATE project_documents
        SET filename=$1, original_name=$2, file_type=$3, uploaded_by=$4, version_num=$5, created_at=NOW()
        WHERE id=$6 RETURNING *
      `, [req.file.filename, req.file.originalname, ext, userId, newVersion, req.params.docId]);

      // Also insert new version record
      await pool.query(`
        INSERT INTO document_versions (document_id, version_num, filename, original_name, file_type, uploaded_by, change_note)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [req.params.docId, newVersion, req.file.filename, req.file.originalname, ext, userId,
          req.body.change_note || `Version ${newVersion} uploaded`]);

      const uploader = await pool.query(`SELECT name FROM users WHERE id=$1`, [userId]);
      res.json({ ...updated.rows[0], uploader_name: uploader.rows[0]?.name });
    } catch (e) { console.log("version upload error:", e.message); res.status(500).json({ message: e.message }); }
  });
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [userId]);
  if (requester.rows[0]?.role !== "boss") return res.status(403).json({ message: "Only managers can delete documents" });
  try {
    await pool.query(`DELETE FROM document_versions WHERE document_id=$1`, [req.params.id]);
    await pool.query(`DELETE FROM project_documents WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const aiController = require("../controllers/aiController");
const alertController = require("../controllers/alertController");
const { authenticateToken } = require("../middleware/authenticateToken");

// Multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (req, file, cb) => cb(null, `ai-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Normalize field names so controller always sees projectId / photoUrl
const normalizeFields = (req, res, next) => {
  // Support both snake_case (frontend) and camelCase (legacy)
  if (req.body.project_id && !req.body.projectId) req.body.projectId = req.body.project_id;
  if (req.body.photo_url && !req.body.photoUrl) req.body.photoUrl = req.body.photo_url;
  if (req.body.blueprint_class && !req.body.blueprintClass) req.body.blueprintClass = req.body.blueprint_class;
  // If file was uploaded, set photoUrl to the served path
  if (req.file && !req.body.photoUrl) {
    req.body.photoUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  }
  next();
};

// AI Photo Analysis
router.get("/ai-analysis/pending", authenticateToken, async (req, res) => {
  const pool = require("../config/db");
  try {
    const r = await pool.query(
      "SELECT * FROM ai_analyses WHERE status='Pending' ORDER BY created_at DESC"
    );
    res.json(r.rows);
  } catch(e) { res.json([]); }
});
router.post("/ai-analysis", authenticateToken, upload.single("photo"), normalizeFields, aiController.analyzePhoto);
router.post("/ai-analysis/:id/approve", authenticateToken, aiController.approveAnalysis);
router.delete("/ai-analysis/:id", authenticateToken, aiController.rejectAnalysis);

// Alerts & Insights
router.get("/alerts", authenticateToken, alertController.getAlerts);
router.post("/alerts", authenticateToken, alertController.createAlert);
router.get("/insights", authenticateToken, alertController.getInsights);

module.exports = router;

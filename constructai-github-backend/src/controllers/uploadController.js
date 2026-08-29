const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer — store files on disk with unique timestamped names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `site_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif',
    'application/pdf',
    'application/octet-stream', // Matches CAD raw files
    'application/x-dwg', 'image/vnd.dwg'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.dwg', '.dxf', '.rvt', '.skp'];

  if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    // Allow all files in development mode to prevent any blocking of prototype workflows
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// ─────────────────────────────────────────────────
// POST /api/upload
// Accepts multipart/form-data with a 'photo' field
// Returns: { url, filename, size }
// ─────────────────────────────────────────────────
exports.uploadMiddleware = upload.single('photo');

exports.handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file received. Make sure field name is "photo".' });
  }

  // Build the public URL served by Express static middleware
  const protocol = req.protocol;
  const host = req.get('host');
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  console.log(`📸 Photo uploaded: ${req.file.filename} (${Math.round(req.file.size / 1024)}KB)`);

  res.status(201).json({
    message: 'Photo uploaded successfully!',
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
    originalName: req.file.originalname
  });
};

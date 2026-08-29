const express = require('express');
const cors = require('cors');
const path = require('path');

// Route imports
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const progressRoutes = require('./routes/progressRoutes');
const costRoutes = require('./routes/costRoutes');
const photoRoutes = require('./routes/photoRoutes');
const aiRoutes = require('./routes/aiRoutes');
const uploadController = require('./controllers/uploadController');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Custom request/response logger for diagnostics
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    console.log(`   Payload:`, JSON.stringify(req.body));
  }
  const originalJson = res.json;
  res.json = function(body) {
    console.log(`   Response Status: ${res.statusCode}`);
    return originalJson.call(this, body);
  };
  next();
});

// ── Serve uploaded photos as static files ────────────────────
// Uploaded photos will be accessible at: http://<host>:5000/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes API Mounting
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api', aiRoutes);

// ── Photo file upload endpoint ──────────────────────────────
// POST /api/upload  →  multipart/form-data, field: "photo"
// Returns { url, filename, size }
app.post(
  '/api/upload',
  authenticateToken,
  uploadController.uploadMiddleware,
  uploadController.handleUpload
);

// Test route
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend is running! ✅' });
});

module.exports = app;

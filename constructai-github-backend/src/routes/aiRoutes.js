const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const alertController = require('../controllers/alertController');
const { authenticateToken } = require('../middleware/auth');

router.post('/ai-analysis', authenticateToken, aiController.analyzePhoto);
router.post('/ai-analysis/:id/approve', authenticateToken, aiController.approveAnalysis);

router.get('/alerts', authenticateToken, alertController.getAlerts);
router.post('/alerts', authenticateToken, alertController.createAlert);

router.get('/insights', authenticateToken, alertController.getInsights);

module.exports = router;

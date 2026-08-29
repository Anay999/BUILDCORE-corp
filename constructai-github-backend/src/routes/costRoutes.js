const express = require('express');
const router = express.Router();
const costController = require('../controllers/costController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, costController.logCost);

module.exports = router;

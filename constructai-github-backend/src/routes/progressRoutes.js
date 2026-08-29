const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, progressController.logProgress);

module.exports = router;

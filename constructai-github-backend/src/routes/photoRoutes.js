const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, photoController.uploadPhoto);

module.exports = router;

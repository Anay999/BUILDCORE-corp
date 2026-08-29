const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/', authenticateToken, requireRole(['Manager', 'Admin']), taskController.createTask);
router.patch('/:id/status', authenticateToken, taskController.updateTaskStatus);

module.exports = router;

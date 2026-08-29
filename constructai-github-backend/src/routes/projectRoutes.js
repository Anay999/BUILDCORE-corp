const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, projectController.getProjects);
router.get('/:id', authenticateToken, projectController.getProjectDetails);
router.post('/', authenticateToken, requireRole(['Manager', 'Admin']), projectController.createProject);
router.post('/:id/workers', authenticateToken, requireRole(['Manager', 'Admin']), projectController.addWorkerToProject);
router.delete('/:id', authenticateToken, requireRole(['Manager', 'Admin']), projectController.deleteProject);

module.exports = router;


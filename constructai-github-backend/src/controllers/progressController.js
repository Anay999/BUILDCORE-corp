const db = require('../config/db');
const mockDb = require('../config/mockDb');

exports.logProgress = async (req, res) => {
  const { projectId, completionPercentage, workDescription, workersCount } = req.body;
  const updatedBy = req.user ? req.user.id : 12; // Logged-in user (worker or manager)

  if (!projectId || completionPercentage === undefined) {
    return res.status(400).json({ error: 'Project ID and completion percentage are required.' });
  }

  try {
    const queryText = `
      INSERT INTO progress_updates (project_id, updated_by, completion_percentage, work_description, workers_count)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      projectId,
      updatedBy,
      completionPercentage,
      workDescription || null,
      workersCount || 0
    ]);

    const progressEntry = result.rows[0];

    // Enrich entry with worker name
    const enrichedQuery = `
      SELECT pu.*, u.full_name AS updated_by_name, p.name AS project_name
      FROM progress_updates pu
      LEFT JOIN users u ON pu.updated_by = u.id
      LEFT JOIN projects p ON pu.project_id = p.id
      WHERE pu.id = $1
    `;
    const enrichedResult = await db.query(enrichedQuery, [progressEntry.id]);
    const enrichedEntry = enrichedResult.rows[0];

    // Broadcast update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('progress_updated', enrichedEntry);
      io.emit('global_activity', {
        type: 'progress',
        action: 'logged',
        projectName: enrichedEntry.project_name,
        completionPercentage: completionPercentage,
        workersCount: workersCount,
        user: req.user ? req.user.fullName : 'A worker',
        timestamp: new Date()
      });
    }

    res.status(201).json({
      message: 'Progress update logged successfully!',
      progressUpdate: enrichedEntry
    });
  } catch (err) {
    console.warn('⚠️ Log progress failed. Falling back to offline mock:', err.message);
    const mockEnrichedEntry = {
      id: Date.now(),
      project_id: Number(projectId),
      updated_by: updatedBy,
      completion_percentage: Number(completionPercentage),
      work_description: workDescription || 'Progress logged offline',
      workers_count: Number(workersCount) || 14,
      created_at: new Date().toISOString(),
      updated_by_name: req.user ? req.user.fullName : 'Ravi',
      project_name: projectId === 1 ? 'Tower A' : `Project #${projectId}`
    };
    
    mockDb.progressUpdates.push(mockEnrichedEntry);
    
    // Update the completion percentage of the project
    const proj = mockDb.projects.find(p => p.id === Number(projectId));
    if (proj) {
      proj.completion_percentage = Number(completionPercentage);
    }
    mockDb.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('progress_updated', mockEnrichedEntry);
      io.emit('global_activity', {
        type: 'progress',
        action: 'logged',
        projectName: mockEnrichedEntry.project_name,
        completionPercentage: completionPercentage,
        workersCount: workersCount,
        user: req.user ? req.user.fullName : 'Ravi',
        timestamp: new Date()
      });
    }
    res.status(201).json({
      message: 'Progress update logged successfully (Offline Simulator)!',
      progressUpdate: mockEnrichedEntry
    });
  }
};

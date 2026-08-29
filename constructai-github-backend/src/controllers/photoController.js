const db = require('../config/db');
const mockDb = require('../config/mockDb');

exports.uploadPhoto = async (req, res) => {
  const { projectId, photoUrl, description } = req.body;
  const uploadedBy = req.user ? req.user.id : 12; // Logged-in user

  if (!projectId || !photoUrl) {
    return res.status(400).json({ error: 'Project ID and photo URL are required.' });
  }

  try {
    const queryText = `
      INSERT INTO photos (project_id, uploaded_by, photo_url, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      projectId,
      uploadedBy,
      photoUrl,
      description || null
    ]);

    const photoEntry = result.rows[0];

    // Enrich entry with uploader's name and project name
    const enrichedQuery = `
      SELECT ph.*, u.full_name AS uploaded_by_name, p.name AS project_name
      FROM photos ph
      LEFT JOIN users u ON ph.uploaded_by = u.id
      LEFT JOIN projects p ON ph.project_id = p.id
      WHERE ph.id = $1
    `;
    const enrichedResult = await db.query(enrichedQuery, [photoEntry.id]);
    const enrichedEntry = enrichedResult.rows[0];

    // Broadcast live event on WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('photo_added', enrichedEntry);
      io.emit('global_activity', {
        type: 'photo',
        action: 'uploaded',
        projectName: enrichedEntry.project_name,
        photoUrl: photoUrl,
        user: req.user ? req.user.fullName : 'A worker',
        timestamp: new Date()
      });
    }

    res.status(201).json({
      message: 'Photo uploaded successfully!',
      photo: enrichedEntry
    });
  } catch (err) {
    console.warn('⚠️ Upload photo failed. Falling back to offline mock:', err.message);
    const mockEnrichedEntry = {
      id: Date.now(),
      project_id: Number(projectId),
      uploaded_by: uploadedBy,
      photo_url: photoUrl,
      description: description || 'Photo uploaded offline',
      uploaded_at: new Date().toISOString(),
      uploaded_by_name: req.user ? req.user.fullName : 'Ravi',
      project_name: projectId === 1 ? 'Tower A' : `Project #${projectId}`
    };
    mockDb.photos.push(mockEnrichedEntry);
    mockDb.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('photo_added', mockEnrichedEntry);
      io.emit('global_activity', {
        type: 'photo',
        action: 'uploaded',
        projectName: mockEnrichedEntry.project_name,
        photoUrl: photoUrl,
        user: req.user ? req.user.fullName : 'Ravi',
        timestamp: new Date()
      });
    }
    res.status(201).json({
      message: 'Photo uploaded successfully (Offline Simulator)!',
      photo: mockEnrichedEntry
    });
  }
};

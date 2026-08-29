const db = require('../config/db');
const mockDb = require('../config/mockDb');

exports.logCost = async (req, res) => {
  const { projectId, laborCost, materialCost, equipmentCost, transportCost, miscellaneous } = req.body;
  const recordedBy = req.user ? req.user.id : 11; // Logged-in user (worker or manager)

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required.' });
  }

  try {
    const queryText = `
      INSERT INTO costs (project_id, recorded_by, labor_cost, material_cost, equipment_cost, transport_cost, miscellaneous)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      projectId,
      recordedBy,
      laborCost || 0,
      materialCost || 0,
      equipmentCost || 0,
      transportCost || 0,
      miscellaneous || 0
    ]);

    const costEntry = result.rows[0];

    // Enrich entry with logger's name and project name
    const enrichedQuery = `
      SELECT c.*, u.full_name AS recorded_by_name, p.name AS project_name
      FROM costs c
      LEFT JOIN users u ON c.recorded_by = u.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE c.id = $1
    `;
    const enrichedResult = await db.query(enrichedQuery, [costEntry.id]);
    const enrichedEntry = enrichedResult.rows[0];

    // Calculate total cost logged in this entry
    const entryTotal = Number(enrichedEntry.labor_cost) +
                       Number(enrichedEntry.material_cost) +
                       Number(enrichedEntry.equipment_cost) +
                       Number(enrichedEntry.transport_cost) +
                       Number(enrichedEntry.miscellaneous);

    // Broadcast update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('cost_added', enrichedEntry);
      io.emit('global_activity', {
        type: 'cost',
        action: 'logged',
        projectName: enrichedEntry.project_name,
        amount: entryTotal,
        user: req.user ? req.user.fullName : 'A worker',
        timestamp: new Date()
      });
    }

    res.status(201).json({
      message: 'Cost logged successfully!',
      cost: enrichedEntry
    });
  } catch (err) {
    console.warn('⚠️ Log cost failed. Falling back to offline mock:', err.message);
    const mockEnrichedEntry = {
      id: Date.now(),
      project_id: Number(projectId),
      recorded_by: recordedBy,
      labor_cost: Number(laborCost) || 0,
      material_cost: Number(materialCost) || 0,
      equipment_cost: Number(equipmentCost) || 0,
      transport_cost: Number(transportCost) || 0,
      miscellaneous: Number(miscellaneous) || 0,
      created_at: new Date().toISOString(),
      recorded_by_name: req.user ? req.user.fullName : 'Arjun M.',
      project_name: projectId === 1 ? 'Tower A' : `Project #${projectId}`
    };
    const entryTotal = Number(mockEnrichedEntry.labor_cost) +
                       Number(mockEnrichedEntry.material_cost) +
                       Number(mockEnrichedEntry.equipment_cost) +
                       Number(mockEnrichedEntry.transport_cost) +
                       Number(mockEnrichedEntry.miscellaneous);
                       
    mockDb.costs.push(mockEnrichedEntry);
    
    // Update total_cost of the project in mockDb
    const proj = mockDb.projects.find(p => p.id === Number(projectId));
    if (proj) {
      proj.total_cost = Number(proj.total_cost) + entryTotal;
    }
    mockDb.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('cost_added', mockEnrichedEntry);
      io.emit('global_activity', {
        type: 'cost',
        action: 'logged',
        projectName: mockEnrichedEntry.project_name,
        amount: entryTotal,
        user: req.user ? req.user.fullName : 'Arjun M.',
        timestamp: new Date()
      });
    }
    res.status(201).json({
      message: 'Cost logged successfully (Offline Simulator)!',
      cost: mockEnrichedEntry
    });
  }
};

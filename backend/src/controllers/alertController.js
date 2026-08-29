const pool = require('../config/db');
const mockDb = require('../config/mockDb');

exports.getAlerts = async (req, res) => {
  try {
    const query = `
      SELECT a.*, p.title AS project_name
      FROM alerts a
      LEFT JOIN projects p ON a.project_id = p.id
      ORDER BY a.timestamp DESC
    `;
    const result = await pool.query(query);
    res.json({ alerts: result.rows });
  } catch (err) {
    console.warn('⚠️ Fetch alerts failed. Returning offline mock data.');
    const enrichedAlerts = mockDb.alerts.map(a => {
      const proj = mockDb.projects.find(p => p.id === a.project_id);
      return {
        ...a,
        project_name: proj ? proj.name : `Project #${a.project_id}`
      };
    });
    res.json({ alerts: enrichedAlerts });
  }
};

exports.getInsights = async (req, res) => {
  try {
    const query = `
      SELECT i.*, p.title AS project_name
      FROM ai_insights i
      LEFT JOIN projects p ON i.project_id = p.id
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query);
    res.json({ insights: result.rows });
  } catch (err) {
    console.warn('⚠️ Fetch insights failed. Returning offline mock data.');
    const enrichedInsights = mockDb.aiInsights.map(i => {
      const proj = mockDb.projects.find(p => p.id === i.project_id);
      return {
        ...i,
        project_name: proj ? proj.name : `Project #${i.project_id}`
      };
    });
    res.json({ insights: enrichedInsights });
  }
};

exports.createAlert = async (req, res) => {
  const { projectId, type, severity, message } = req.body;

  if (!projectId || !type || !message) {
    return res.status(400).json({ error: 'Project ID, type, and message are required.' });
  }

  const mockAlert = {
    id: Date.now(),
    project_id: projectId,
    type,
    severity: severity || 'info',
    message,
    timestamp: new Date().toISOString()
  };

  try {
    const query = `
      INSERT INTO alerts (project_id, type, severity, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [projectId, type, severity || 'info', message]);
    const newAlert = result.rows[0];

    // WebSocket Broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('alert_raised', {
        alert: newAlert,
        projectName: `Project #${projectId}`
      });
    }

    res.status(201).json({
      message: 'Alert registered successfully!',
      alert: newAlert
    });
  } catch (err) {
    console.warn('⚠️ Database query failed. Falling back to active socket broadcast:', err.message);
    
    mockAlert.project_id = Number(mockAlert.project_id);
    mockDb.alerts.push(mockAlert);
    mockDb.save();

    // Broadcast the mock alert anyway so real-time sync works offline!
    const io = req.app.get('io');
    if (io) {
      io.emit('alert_raised', {
        alert: mockAlert,
        projectName: projectId === 1 ? 'Tower A' : `Project #${projectId}`
      });
    }
    
    res.status(201).json({
      message: 'Alert registered successfully (Offline Simulator)!',
      alert: mockAlert
    });
  }
};

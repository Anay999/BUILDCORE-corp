const db = require('../config/db');
const mockDb = require('../config/mockDb');

exports.createProject = async (req, res) => {
  const { name, location, budget, startDate, endDate, blueprint, blueprintFileUrl, workers } = req.body;
  const managerId = req.user ? req.user.id : 11; // The logged-in manager

  if (!name) {
    return res.status(400).json({ error: 'Project name is required.' });
  }

  // Self-healing schema validation
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_project_member UNIQUE(project_id, user_id)
      );
    `);
    await db.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS blueprint_file_url TEXT;
    `);
  } catch (err) {
    console.warn('⚠️ Self-healing schema migration failed or was bypassed.');
  }

  try {
    const queryText = `
      INSERT INTO projects (name, location, manager_id, budget, start_date, end_date, blueprint, blueprint_file_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      name,
      location || null,
      managerId,
      budget || 0,
      startDate || null,
      endDate || null,
      blueprint || 'Standard Warehouse',
      blueprintFileUrl || null
    ]);

    const createdProject = result.rows[0];

    // Allocate workers
    if (Array.isArray(workers) && workers.length > 0) {
      const bcrypt = require('bcryptjs');
      const { sendWorkerAllocationEmail, sendEmail } = require('../services/emailService');
      for (const w of workers) {
        if (!w.email) continue;
        let userId = null;
        let plainPassword = null;
        const userExistRes = await db.query('SELECT id FROM users WHERE email = $1', [w.email]);
        if (userExistRes.rows.length > 0) {
          userId = userExistRes.rows[0].id;
        } else {
          plainPassword = 'pass_' + Math.floor(1000 + Math.random() * 9000);
          const salt = await bcrypt.genSalt(10);
          const defaultPasswordHash = await bcrypt.hash(plainPassword, salt);
          const userInsertRes = await db.query(`
            INSERT INTO users (email, password_hash, full_name, role)
            VALUES ($1, $2, $3, 'Worker')
            RETURNING id
          `, [w.email, defaultPasswordHash, w.name || 'Worker']);
          userId = userInsertRes.rows[0].id;
        }
        await db.query(`
          INSERT INTO project_members (project_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT ON CONSTRAINT unique_project_member DO NOTHING
        `, [createdProject.id, userId]);

        // Send Email
        try {
          await sendWorkerAllocationEmail({
            email: w.email,
            fullName: w.name || 'Worker',
            password: plainPassword || null,
            projectName: createdProject.name,
            projectLocation: createdProject.location
          });
        } catch (mailErr) {
          console.error('⚠️ Worker allocation email failure:', mailErr.message);
        }
      }
    }

    // Broadcast new project to all connected sockets
    const io = req.app.get('io');
    if (io) {
      io.emit('project_created', createdProject);
    }

    res.status(201).json({
      message: 'Project created successfully!',
      project: createdProject
    });
  } catch (err) {
    console.warn('⚠️ Create project query failed. Falling back to mock database response:', err.message);
    
    const mockNewProject = {
      id: Date.now(),
      name,
      location: location || 'Sector 5',
      manager_id: managerId,
      manager_name: req.user ? req.user.fullName : 'Arjun M.',
      budget: Number(budget) || 40000000.00,
      start_date: startDate || new Date().toISOString().split('T')[0],
      end_date: endDate || new Date(Date.now() + 86400000 * 180).toISOString().split('T')[0],
      total_cost: 0,
      completion_percentage: 0,
      risk_level: 'On track',
      blueprint: blueprint || 'Standard Warehouse',
      blueprint_file_url: blueprintFileUrl || null
    };

    // Save to global backend in-memory database
    mockDb.projects.push(mockNewProject);

    // Save mock members allocations
    if (Array.isArray(workers) && workers.length > 0) {
      if (!mockDb.projectMembers) {
        mockDb.projectMembers = [
          { project_id: 1, email: 'ravi@constructai.com', fullName: 'Ravi', role: 'Worker' }
        ];
      }
      const { sendWorkerAllocationEmail } = require('../services/emailService');
      for (const w of workers) {
        if (w.email) {
          mockDb.projectMembers.push({
            project_id: mockNewProject.id,
            email: w.email,
            fullName: w.name || 'Worker',
            role: 'Worker'
          });

          // Check if user exists in mockDb.users. If not, generate password and add.
          let mockUser = mockDb.users.find(u => u.email === w.email);
          let plainPassword = null;
          if (!mockUser) {
            plainPassword = 'pass_' + Math.floor(1000 + Math.random() * 9000);
            mockUser = {
              id: Date.now() + Math.floor(Math.random() * 1000),
              email: w.email,
              password: plainPassword,
              fullName: w.name || 'Worker',
              role: 'Worker'
            };
            mockDb.users.push(mockUser);
          }

          // Send Email
          try {
            await sendWorkerAllocationEmail({
              email: w.email,
              fullName: w.name || 'Worker',
              password: plainPassword || null,
              projectName: mockNewProject.name,
              projectLocation: mockNewProject.location
            });
          } catch (mailErr) {
            console.error('⚠️ Worker allocation email failure (Mock):', mailErr.message);
          }
        }
      }
    }

    mockDb.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('project_created', mockNewProject);
    }

    res.status(201).json({
      message: 'Project created successfully (Offline Simulator)!',
      project: mockNewProject
    });
  }
};

exports.getProjects = async (req, res) => {
  try {
    // Premium query: fetches project data, computes total cost logging, and grabs the latest completion percentage
    const queryText = `
      SELECT 
        p.*, 
        u.full_name AS manager_name,
        COALESCE(
          (SELECT SUM(labor_cost + material_cost + equipment_cost + transport_cost + miscellaneous) 
           FROM costs WHERE project_id = p.id), 
          0
        ) AS total_cost,
        COALESCE(
          (SELECT completion_percentage FROM progress_updates 
           WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1),
          0
        ) AS completion_percentage
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(queryText);
    res.json({ projects: result.rows });
  } catch (err) {
    console.warn('⚠️ Fetch projects query failed. Returning offline mock projects:', err.message);
    res.json({ projects: mockDb.projects });
  }
};

exports.getProjectDetails = async (req, res) => {
  const { id } = req.params;

  try {
    // Project details
    const projectQuery = `
      SELECT p.*, u.full_name AS manager_name
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.id = $1
    `;
    const projectResult = await db.query(projectQuery, [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const project = projectResult.rows[0];

    // Tasks list
    const tasksQuery = `
      SELECT t.*, u.full_name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `;
    const tasksResult = await db.query(tasksQuery, [id]);

    // Progress entries
    const progressQuery = `
      SELECT pu.*, u.full_name AS updated_by_name
      FROM progress_updates pu
      LEFT JOIN users u ON pu.updated_by = u.id
      WHERE pu.project_id = $1
      ORDER BY pu.created_at DESC
    `;
    const progressResult = await db.query(progressQuery, [id]);

    // Cost entries
    const costsQuery = `
      SELECT c.*, u.full_name AS recorded_by_name
      FROM costs c
      LEFT JOIN users u ON c.recorded_by = u.id
      WHERE c.project_id = $1
      ORDER BY c.created_at DESC
    `;
    const costsResult = await db.query(costsQuery, [id]);

    // Photos list
    const photosQuery = `
      SELECT ph.*, u.full_name AS uploaded_by_name
      FROM photos ph
      LEFT JOIN users u ON ph.uploaded_by = u.id
      WHERE ph.project_id = $1
      ORDER BY ph.uploaded_at DESC
    `;
    const photosResult = await db.query(photosQuery, [id]);

    // Project members list
    let membersResult = { rows: [] };
    try {
      const membersQuery = `
        SELECT pm.*, u.full_name, u.email, u.role
        FROM project_members pm
        LEFT JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1
      `;
      membersResult = await db.query(membersQuery, [id]);
    } catch (err) {
      console.warn('⚠️ Fetch project members table failed.');
    }

    // Calculations
    const totalCost = costsResult.rows.reduce((sum, item) => {
      return sum + Number(item.labor_cost) + Number(item.material_cost) + Number(item.equipment_cost) + Number(item.transport_cost) + Number(item.miscellaneous);
    }, 0);

    const latestProgress = progressResult.rows.length > 0 
      ? Number(progressResult.rows[0].completion_percentage) 
      : 0;

    res.json({
      project: {
        ...project,
        total_cost: totalCost,
        completion_percentage: latestProgress
      },
      tasks: tasksResult.rows,
      progressUpdates: progressResult.rows,
      costs: costsResult.rows,
      photos: photosResult.rows,
      members: membersResult.rows
    });
  } catch (err) {
    console.warn(`⚠️ Fetch project details query failed for project ${id}. Returning offline mock project details:`, err.message);
    
    const projectId = Number(id);
    const proj = mockDb.projects.find(p => p.id === projectId) || mockDb.projects[0];
    const tasks = mockDb.tasks.filter(t => t.project_id === projectId);
    const progress = mockDb.progressUpdates.filter(p => p.project_id === projectId);
    const costs = mockDb.costs.filter(c => c.project_id === projectId);
    const photos = mockDb.photos.filter(ph => ph.project_id === projectId);

    if (!mockDb.projectMembers) {
      mockDb.projectMembers = [
        { project_id: 1, email: 'ravi@constructai.com', fullName: 'Ravi', role: 'Worker' }
      ];
    }
    const members = mockDb.projectMembers.filter(m => m.project_id === projectId).map((m, idx) => {
      const u = mockDb.users.find(usr => usr.email === m.email);
      return {
        id: idx + 100,
        project_id: m.project_id,
        full_name: m.fullName || m.full_name,
        email: m.email,
        role: m.role,
        password: u ? u.password : 'password123'
      };
    });

    res.json({
      project: proj,
      tasks,
      progressUpdates: progress,
      costs,
      photos,
      members
    });
  }
};

exports.addWorkerToProject = async (req, res) => {
  const { id } = req.params; // project ID
  const { email, fullName } = req.body;

  if (!email || !fullName) {
    return res.status(400).json({ error: 'Worker email and name are required.' });
  }

  try {
    // Fetch project details for the email body
    let project = { name: `Project #${id}`, location: 'Sector 5' };
    try {
      const projectRes = await db.query('SELECT name, location FROM projects WHERE id = $1', [id]);
      if (projectRes.rows.length > 0) {
        project = projectRes.rows[0];
      }
    } catch (e) {}

    // 1. Check if user already exists in db
    let userId = null;
    let plainPassword = null;
    const userExistRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (userExistRes.rows.length > 0) {
      userId = userExistRes.rows[0].id;
    } else {
      plainPassword = 'pass_' + Math.floor(1000 + Math.random() * 9000);
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const defaultPasswordHash = await bcrypt.hash(plainPassword, salt);
      const userInsertRes = await db.query(`
        INSERT INTO users (email, password_hash, full_name, role)
        VALUES ($1, $2, $3, 'Worker')
        RETURNING id
      `, [email, defaultPasswordHash, fullName]);
      userId = userInsertRes.rows[0].id;
    }

    // 2. Link user to the project in project_members
    await db.query(`
      INSERT INTO project_members (project_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (project_id, user_id) DO NOTHING
    `, [id, userId]);

    // Send allocation email
    try {
      const { sendWorkerAllocationEmail } = require('../services/emailService');
      await sendWorkerAllocationEmail({
        email,
        fullName,
        password: plainPassword || null,
        projectName: project.name,
        projectLocation: project.location
      });
    } catch (mailErr) {
      console.error('⚠️ Worker allocation email failure:', mailErr.message);
    }

    // 3. Trigger WebSocket alert
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('worker_added', {
        projectId: Number(id),
        email,
        fullName,
        role: 'Worker'
      });
      io.emit('global_activity', {
        type: 'worker',
        action: 'added',
        projectName: project.name,
        user: fullName,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      message: 'Worker successfully added to project!',
      worker: {
        id: userId,
        email,
        full_name: fullName,
        role: 'Worker',
        password: plainPassword || 'password123'
      }
    });

  } catch (err) {
    console.warn('⚠️ Add worker database query failed. Falling back to mockDb:', err.message);

    const proj = mockDb.projects.find(p => p.id === Number(id)) || { name: `Project #${id}`, location: 'Sector 5' };

    // Save to backend stateful mock database
    if (!mockDb.projectMembers) {
      mockDb.projectMembers = [
        { project_id: 1, email: 'ravi@constructai.com', fullName: 'Ravi', role: 'Worker' }
      ];
    }

    const newMockMember = {
      project_id: Number(id),
      email,
      fullName,
      role: 'Worker'
    };
    mockDb.projectMembers.push(newMockMember);

    // Register user in mockDb.users if not exists
    let mockUser = mockDb.users.find(u => u.email === email);
    let plainPassword = null;
    if (!mockUser) {
      plainPassword = 'pass_' + Math.floor(1000 + Math.random() * 9000);
      mockUser = {
        id: Date.now(),
        email,
        password: plainPassword,
        fullName,
        role: 'Worker'
      };
      mockDb.users.push(mockUser);
    }
    mockDb.save();

    // Send Allocation Email
    try {
      const { sendWorkerAllocationEmail } = require('../services/emailService');
      await sendWorkerAllocationEmail({
        email,
        fullName,
        password: plainPassword || null,
        projectName: proj.name,
        projectLocation: proj.location
      });
    } catch (mailErr) {
      console.error('⚠️ Worker allocation email failure (Mock Add):', mailErr.message);
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${id}`).emit('worker_added', {
        projectId: Number(id),
        email,
        fullName,
        role: 'Worker'
      });
      io.emit('global_activity', {
        type: 'worker',
        action: 'added',
        projectName: proj.name,
        user: fullName,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      message: 'Worker successfully added to project (Offline Simulator)!',
      worker: {
        id: Date.now(),
        email,
        full_name: fullName,
        role: 'Worker',
        password: mockUser ? mockUser.password : 'password123'
      }
    });
  }
};

exports.deleteProject = async (req, res) => {
  const { id } = req.params;
  const projectId = Number(id);

  try {
    // Start transactional cascading delete in PostgreSQL
    await db.query('BEGIN');
    await db.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
    await db.query('DELETE FROM photos WHERE project_id = $1', [projectId]);
    await db.query('DELETE FROM progress_updates WHERE project_id = $1', [projectId]);
    await db.query('DELETE FROM costs WHERE project_id = $1', [projectId]);
    if (db.query) {
      // If table exists
      try {
        await db.query('DELETE FROM project_members WHERE project_id = $1', [projectId]);
      } catch (e) {}
    }
    await db.query('DELETE FROM alerts WHERE project_id = $1', [projectId]);
    await db.query('DELETE FROM ai_insights WHERE project_id = $1', [projectId]);
    await db.query('DELETE FROM ai_analyses WHERE project_id = $1', [projectId]);
    try {
      await db.query('DELETE FROM photo_analysis WHERE project_id = $1', [projectId]);
      await db.query('DELETE FROM milestone_tracking WHERE project_id = $1', [projectId]);
      await db.query('DELETE FROM delay_alerts WHERE project_id = $1', [projectId]);
    } catch (e) {}
    await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await db.query('COMMIT');

    // Broadcast deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('project_deleted', projectId);
    }

    res.json({ message: 'Project and all associated records permanently deleted.' });
  } catch (err) {
    console.warn(`⚠️ Database delete failed for project ${projectId}. Falling back to mockDb:`, err.message);
    if (db && db.query) {
      try {
        await db.query('ROLLBACK');
      } catch (rollbackErr) {
        // ignore
      }
    }

    // Database Offline (Mock Fallback)
    mockDb.projects = mockDb.projects.filter(p => p.id !== projectId);
    mockDb.tasks = mockDb.tasks.filter(t => t.project_id !== projectId);
    mockDb.progressUpdates = mockDb.progressUpdates.filter(p => p.project_id !== projectId);
    mockDb.costs = mockDb.costs.filter(c => c.project_id !== projectId);
    mockDb.photos = mockDb.photos.filter(ph => ph.project_id !== projectId);
    mockDb.alerts = mockDb.alerts.filter(a => a.project_id !== projectId);
    mockDb.aiInsights = mockDb.aiInsights.filter(i => i.project_id !== projectId);
    if (mockDb.projectMembers) {
      mockDb.projectMembers = mockDb.projectMembers.filter(m => m.project_id !== projectId);
    }
    if (mockDb.aiAnalyses) {
      mockDb.aiAnalyses = mockDb.aiAnalyses.filter(a => a.project_id !== projectId);
    }
    mockDb.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('project_deleted', projectId);
    }

    res.json({ message: 'Project and all associated records permanently deleted (Offline Simulator).' });
  }
};


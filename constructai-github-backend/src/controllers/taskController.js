const db = require('../config/db');
const mockDb = require('../config/mockDb');

exports.createTask = async (req, res) => {
  const { projectId, title, assignedTo, status, dueDate } = req.body;

  if (!projectId || !title) {
    return res.status(400).json({ error: 'Project ID and title are required.' });
  }

  try {
    const queryText = `
      INSERT INTO tasks (project_id, title, assigned_to, status, due_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      projectId,
      title,
      assignedTo || null,
      status || 'Pending',
      dueDate || null
    ]);

    const createdTask = result.rows[0];

    // Fetch assigned user full name to broadcast a clean object
    let assignedName = null;
    if (createdTask.assigned_to) {
      const userRes = await db.query('SELECT full_name FROM users WHERE id = $1', [createdTask.assigned_to]);
      if (userRes.rows.length > 0) {
        assignedName = userRes.rows[0].full_name;
      }
    }

    const broadcastData = {
      ...createdTask,
      assigned_to_name: assignedName
    };

    // Broadcast live task addition to the specific project room
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('task_created', broadcastData);
      io.emit('global_activity', {
        type: 'task',
        action: 'created',
        projectName: `Project #${projectId}`, // Simplified for activity description
        title: title,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      message: 'Task created successfully!',
      task: broadcastData
    });
  } catch (err) {
    console.warn('⚠️ Create task failed. Falling back to offline mock:', err.message);
    const mockTask = {
      id: Date.now(),
      project_id: Number(projectId),
      title,
      assigned_to: assignedTo || null,
      assigned_to_name: assignedTo === 12 ? 'Ravi' : 'Worker',
      status: status || 'Pending',
      due_date: dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]
    };
    mockDb.tasks.push(mockTask);
    mockDb.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('task_created', mockTask);
      io.emit('global_activity', {
        type: 'task',
        action: 'created',
        projectName: projectId === 1 ? 'Tower A' : `Project #${projectId}`,
        title: title,
        timestamp: new Date()
      });
    }
    res.status(201).json({
      message: 'Task created successfully (Offline Simulator)!',
      task: mockTask
    });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    // Verify task exists
    const findQuery = 'SELECT * FROM tasks WHERE id = $1';
    const findRes = await db.query(findQuery, [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = findRes.rows[0];

    // Update status
    const updateQuery = 'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *';
    const result = await db.query(updateQuery, [status, id]);
    const updatedTask = result.rows[0];

    // Fetch details for socket notification
    const userRes = await db.query('SELECT full_name FROM users WHERE id = $1', [updatedTask.assigned_to]);
    const projectRes = await db.query('SELECT name FROM projects WHERE id = $1', [updatedTask.project_id]);

    const assignedName = userRes.rows.length > 0 ? userRes.rows[0].full_name : null;
    const projectName = projectRes.rows.length > 0 ? projectRes.rows[0].name : `Project #${updatedTask.project_id}`;

    const enrichedTask = {
      ...updatedTask,
      assigned_to_name: assignedName
    };

    // Broadcast on socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${updatedTask.project_id}`).emit('task_updated', enrichedTask);
      io.emit('global_activity', {
        type: 'task',
        action: 'updated',
        projectName: projectName,
        title: updatedTask.title,
        status: status,
        user: req.user ? req.user.fullName : 'A worker',
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Task status updated successfully!',
      task: enrichedTask
    });
  } catch (err) {
    console.warn('⚠️ Update task status failed. Falling back to offline mock:', err.message);
    const taskId = Number(id);
    const taskIndex = mockDb.tasks.findIndex(t => t.id === taskId);
    let mockEnrichedTask = {
      id: taskId,
      project_id: 1,
      title: 'Task Update',
      assigned_to_name: 'Ravi',
      status: status
    };
    if (taskIndex !== -1) {
      mockDb.tasks[taskIndex].status = status;
      mockDb.save();
      mockEnrichedTask = {
        ...mockDb.tasks[taskIndex]
      };
    }
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${mockEnrichedTask.project_id}`).emit('task_updated', mockEnrichedTask);
      io.emit('global_activity', {
        type: 'task',
        action: 'updated',
        projectName: mockEnrichedTask.project_id === 1 ? 'Tower A' : `Project #${mockEnrichedTask.project_id}`,
        title: mockEnrichedTask.title,
        status: status,
        user: req.user ? req.user.fullName : 'Ravi',
        timestamp: new Date()
      });
    }
    res.json({
      message: 'Task status updated successfully (Offline Simulator)!',
      task: mockEnrichedTask
    });
  }
};

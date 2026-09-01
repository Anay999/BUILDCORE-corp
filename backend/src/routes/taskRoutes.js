const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");
const { createNotification } = require("./notificationRoutes");
const { broadcast } = require("../utils/broadcast");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// GET /api/tasks/completed/all — all completed tasks across projects (for dashboard)
router.get("/completed/all", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `SELECT t.id, t.project_id, t.title, t.completed, t.priority, t.due_date,
              t.assigned_to, t.status, t.created_at,
              p.title AS project_title,
              u.name AS assigned_to_name
       FROM project_tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.completed = true
       ORDER BY t.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET /api/tasks/:projectId — list all tasks for a project
router.get("/:projectId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await pool.query(
      `SELECT t.id, t.project_id, t.title, t.completed, t.completed_by, t.created_by, t.created_at,
              t.priority, t.due_date, t.assigned_to, t.status,
              u.name AS creator_name
       FROM project_tasks t
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.project_id = $1
       ORDER BY t.created_at ASC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/tasks — create a task (boss only)
router.post("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [userId]);
  if (requester.rows[0]?.role !== "boss") return res.status(403).json({ message: "Only managers can create tasks" });

  const { project_id, title, priority, due_date, assigned_to } = req.body;
  if (!project_id || !title?.trim()) return res.status(400).json({ message: "Missing fields" });
  try {
    const result = await pool.query(
      `INSERT INTO project_tasks (project_id, title, created_by, priority, due_date, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id, title.trim(), userId, priority || "medium", due_date || null, assigned_to || null]
    );
    // Notify assignee
    if (assigned_to && assigned_to !== userId) {
      createNotification(assigned_to, "task", "Task assigned to you", title.trim(), "projects", project_id);
    }
    broadcast("task_update", { action: "created", task: result.rows[0] });
    res.json(result.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PUT /api/tasks/:id/toggle — toggle completed
router.put("/:id/toggle", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    // get current state
    const cur = await pool.query(`SELECT completed FROM project_tasks WHERE id=$1`, [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ message: "Task not found" });

    const nowCompleted = !cur.rows[0].completed;
    const result = await pool.query(
      `UPDATE project_tasks
       SET completed=$1, completed_by=$2
       WHERE id=$3
       RETURNING *`,
      [nowCompleted, nowCompleted ? userId : null, req.params.id]
    );
    broadcast("task_update", { action: "toggle", task: result.rows[0] });
    res.json(result.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PUT /api/tasks/:id/status — update kanban column status
router.put("/:id/status", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { status } = req.body;
  if (!["pending", "in_progress", "done"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  try {
    // "done" also marks completed; going back un-marks it
    const isDone = status === "done";
    const result = await pool.query(
      `UPDATE project_tasks
       SET status=$1, completed=$2, completed_by=$3
       WHERE id=$4 RETURNING *`,
      [status, isDone, isDone ? userId : null, req.params.id]
    );
    broadcast("task_update", { action: "status", task: result.rows[0] });
    res.json(result.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/tasks/:id — boss only
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [userId]);
  if (requester.rows[0]?.role !== "boss") return res.status(403).json({ message: "Only managers can delete tasks" });
  try {
    await pool.query(`DELETE FROM project_tasks WHERE id=$1`, [req.params.id]);
    broadcast("task_update", { action: "deleted", id: req.params.id });
    res.json({ success: true });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});
module.exports = router;

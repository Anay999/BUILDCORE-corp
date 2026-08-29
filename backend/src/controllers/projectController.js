const pool = require("../config/db");
const { broadcast } = require("../utils/broadcast");

const createProject = async (req, res) => {
  try {
    const { title, location, status, budget, deadline, assigned_users, client_name, blueprint } = req.body;
    const image = req.file ? req.file.filename : "";
    const budgetValue = budget && budget !== "" ? budget : 0;

    const newProject = await pool.query(
      `INSERT INTO projects (title, location, status, budget, image, deadline, client_name, blueprint)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, location, status, budgetValue, image, deadline || null, client_name || "", blueprint || 'Standard Warehouse']
    );

    const projectId = newProject.rows[0].id;

    if (assigned_users) {
      const users = JSON.parse(assigned_users);
      for (const userId of users) {
        await pool.query(
          `INSERT INTO project_assignments (project_id, user_id) VALUES ($1, $2)`,
          [projectId, userId]
        );
      }
    }

    broadcast("project_update", { action: "created", id: projectId, title, status });
    res.json(newProject.rows[0]);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "Server error ❌" });
  }
};

const getProjects = async (req, res) => {
  try {
    const projects = await pool.query(
      `SELECT projects.*,
        COALESCE(
          json_agg(
            json_build_object('id', users.id, 'name', users.name, 'profile_picture', users.profile_picture)
          ) FILTER (WHERE users.id IS NOT NULL),
          '[]'
        ) as assigned_users,
        COALESCE((
          SELECT SUM(amount) FROM expenses WHERE project_id = projects.id
        ), 0) +
        COALESCE((
          SELECT SUM(qty_used * unit_cost) FROM materials WHERE project_id = projects.id
        ), 0) AS spent
       FROM projects
       LEFT JOIN project_assignments ON projects.id = project_assignments.project_id
       LEFT JOIN users ON project_assignments.user_id = users.id
       GROUP BY projects.id
       ORDER BY projects.id ASC`
    );
    res.json(projects.rows);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error ❌" });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, location, status, budget, deadline, assigned_users, client_name, blueprint } = req.body;
    const budgetValue = budget && budget !== "" ? budget : 0;
    const image = req.file ? req.file.filename : null;

    if (image) {
      await pool.query(
        `UPDATE projects SET title=$1, location=$2, status=$3, budget=$4, deadline=$5, image=$6, client_name=$7, blueprint=$8 WHERE id=$9`,
        [title, location, status, budgetValue, deadline || null, image, client_name || "", blueprint || 'Standard Warehouse', id]
      );
    } else {
      await pool.query(
        `UPDATE projects SET title=$1, location=$2, status=$3, budget=$4, deadline=$5, client_name=$6, blueprint=$7 WHERE id=$8`,
        [title, location, status, budgetValue, deadline || null, client_name || "", blueprint || 'Standard Warehouse', id]
      );
    }

    await pool.query(`DELETE FROM project_assignments WHERE project_id = $1`, [id]);

    if (assigned_users) {
      const users = Array.isArray(assigned_users) ? assigned_users : JSON.parse(assigned_users);
      for (const userId of users) {
        await pool.query(
          `INSERT INTO project_assignments (project_id, user_id) VALUES ($1, $2)`,
          [id, userId]
        );
      }
    }

    const updated = await pool.query(`SELECT * FROM projects WHERE id = $1`, [id]);
    broadcast("project_update", { action: "updated", id: Number(id), title, status });
    res.json({ message: "Project updated ✏️", project: updated.rows[0] });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error ❌" });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM project_assignments WHERE project_id = $1`, [id]);
    await pool.query(`DELETE FROM projects WHERE id = $1`, [id]);
    broadcast("project_update", { action: "deleted", id: Number(id) });
    res.json({ message: "Project deleted 🗑️" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error ❌" });
  }
};

module.exports = { addProject: createProject, getProjects, updateProject, deleteProject };
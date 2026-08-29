const express = require("express");
const router = express.Router();
const { getProjects, addProject, updateProject, deleteProject } = require("../controllers/projectController");
const upload = require("../middleware/uploadMiddleware");

router.get("/", getProjects);

// GET /api/projects/:id — single project with team + spent
router.get("/:id", async (req, res) => {
  const pool = require("../config/db");
  try {
    const { id } = req.params;
    const [projR, teamR] = await Promise.all([
      pool.query(`
        SELECT p.*,
          COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id=p.id),0)
          + COALESCE((SELECT SUM(qty_used*unit_cost) FROM materials WHERE project_id=p.id),0) AS spent,
          (SELECT json_agg(json_build_object('id',u.id,'name',u.name,'role',u.role))
           FROM users u JOIN project_assignments pa ON pa.user_id=u.id WHERE pa.project_id=p.id) AS team
        FROM projects p WHERE p.id=$1
      `, [id]),
      pool.query(`
        SELECT u.id, u.name, u.role FROM users u
        JOIN project_assignments pa ON pa.user_id=u.id WHERE pa.project_id=$1
      `, [id]),
    ]);
    if (!projR.rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ ...projR.rows[0], team_members: teamR.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", upload.single("image"), addProject);
router.put("/:id", upload.single("image"), updateProject);
router.delete("/:id", deleteProject);

module.exports = router;
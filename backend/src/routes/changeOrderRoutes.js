const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { broadcast } = require("../utils/broadcast");

pool.query(`
  CREATE TABLE IF NOT EXISTS change_orders (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL,
    raised_by       INTEGER NOT NULL,
    type            VARCHAR(30) NOT NULL DEFAULT 'change_order',
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    cost_impact     NUMERIC(14,2) DEFAULT 0,
    time_impact     INTEGER DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by     INTEGER,
    review_note     TEXT,
    reviewed_at     TIMESTAMP,
    budget_applied  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("change_orders table:", e.message));

// Add budget_applied column to existing tables
pool.query(`ALTER TABLE change_orders ADD COLUMN IF NOT EXISTS budget_applied BOOLEAN DEFAULT FALSE`)
  .catch(() => {});

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// GET /api/change-orders/:projectId
router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT co.*,
         u.name AS raised_by_name, u.role AS raised_by_role,
         rv.name AS reviewed_by_name
       FROM change_orders co
       JOIN users u ON co.raised_by = u.id
       LEFT JOIN users rv ON co.reviewed_by = rv.id
       WHERE co.project_id = $1
       ORDER BY co.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/change-orders
router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, raised_by, type, title, description, cost_impact, time_impact } = req.body;
    const r = await pool.query(
      `INSERT INTO change_orders (project_id, raised_by, type, title, description, cost_impact, time_impact)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id, raised_by, type || "change_order", title, description || null,
       cost_impact || 0, time_impact || 0]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /api/change-orders/:id/review — approve or reject + auto-update budget
router.patch("/:id/review", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!["boss","manager"].includes(user.role)) return res.status(403).json({ message: "Forbidden" });
  try {
    const { status, review_note } = req.body;
    if (!["approved","rejected"].includes(status)) return res.status(400).json({ message: "status must be approved or rejected" });

    // Get the change order
    const coR = await pool.query(`SELECT * FROM change_orders WHERE id=$1`, [req.params.id]);
    if (!coR.rows[0]) return res.status(404).json({ message: "Not found" });
    const co = coR.rows[0];

    // Update change order status
    const r = await pool.query(
      `UPDATE change_orders
       SET status=$1, reviewed_by=$2, review_note=$3, reviewed_at=NOW(), updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, user.id, review_note || null, req.params.id]
    );

    // If approved and cost_impact non-zero and not already applied → update project budget
    if (status === "approved" && parseFloat(co.cost_impact) !== 0 && !co.budget_applied) {
      await pool.query(
        `UPDATE projects
         SET budget = GREATEST(0, COALESCE(budget,0) + $1), updated_at=NOW()
         WHERE id = $2`,
        [parseFloat(co.cost_impact), co.project_id]
      );
      await pool.query(
        `UPDATE change_orders SET budget_applied=TRUE WHERE id=$1`,
        [req.params.id]
      );
      // Broadcast so frontend refreshes project list
      broadcast("project_update", {
        action: "budget_adjusted",
        project_id: co.project_id,
        change_order_id: co.id,
        cost_impact: co.cost_impact,
      });
    }

    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/change-orders/:id
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM change_orders WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

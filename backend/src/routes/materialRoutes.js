const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const jwt     = require("jsonwebtoken");

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// Create tables
pool.query(`
  CREATE TABLE IF NOT EXISTS materials (
    id                 SERIAL PRIMARY KEY,
    project_id         INTEGER NOT NULL,
    name               VARCHAR(200) NOT NULL,
    unit               VARCHAR(50)  NOT NULL DEFAULT 'units',
    qty_ordered        NUMERIC(12,2) NOT NULL DEFAULT 0,
    qty_used           NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit_cost          NUMERIC(12,2) NOT NULL DEFAULT 0,
    supplier           VARCHAR(200),
    low_stock_threshold NUMERIC(12,2) NOT NULL DEFAULT 10,
    notes              TEXT,
    created_at         TIMESTAMP DEFAULT NOW(),
    updated_at         TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("materials table:", e.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS material_usage_log (
    id          SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL,
    project_id  INTEGER NOT NULL,
    qty_used    NUMERIC(12,2) NOT NULL,
    note        TEXT,
    used_by     VARCHAR(200),
    used_at     TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("material_usage_log:", e.message));

// GET all materials for a project
router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT m.*,
              GREATEST(0, m.qty_ordered - m.qty_used) AS qty_remaining,
              m.qty_ordered * m.unit_cost              AS total_cost,
              m.qty_used    * m.unit_cost              AS cost_used,
              CASE WHEN GREATEST(0, m.qty_ordered - m.qty_used) <= m.low_stock_threshold
                   THEN true ELSE false END            AS is_low_stock
       FROM materials m
       WHERE m.project_id = $1
       ORDER BY m.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET usage log for a material
router.get("/:projectId/log/:materialId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT * FROM material_usage_log WHERE material_id=$1 ORDER BY used_at DESC LIMIT 50`,
      [req.params.materialId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// POST — add new material
router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, name, unit, qty_ordered, unit_cost, supplier, low_stock_threshold, notes } = req.body;
    if (!project_id || !name) return res.status(400).json({ message: "project_id and name required" });
    const r = await pool.query(
      `INSERT INTO materials (project_id, name, unit, qty_ordered, unit_cost, supplier, low_stock_threshold, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [project_id, name, unit || "units", qty_ordered || 0, unit_cost || 0,
       supplier || null, low_stock_threshold || 10, notes || null]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PUT — edit material details
router.put("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { name, unit, qty_ordered, unit_cost, supplier, low_stock_threshold, notes } = req.body;
    const r = await pool.query(
      `UPDATE materials SET name=$1, unit=$2, qty_ordered=$3, unit_cost=$4,
       supplier=$5, low_stock_threshold=$6, notes=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, unit, qty_ordered, unit_cost, supplier || null, low_stock_threshold, notes || null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST — log usage (deducts from stock)
router.post("/:id/use", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const user = getUser(req);
    const { qty, note, project_id } = req.body;
    if (!qty || qty <= 0) return res.status(400).json({ message: "qty must be > 0" });

    // Update material
    const r = await pool.query(
      `UPDATE materials SET qty_used = qty_used + $1, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [qty, req.params.id]
    );
    const mat = r.rows[0];

    // Sync: deduct from linked inventory item if present
    if (mat.inventory_item_id) {
      await pool.query(
        `UPDATE inventory_items SET qty_in_stock = GREATEST(0, qty_in_stock - $1), updated_at=NOW() WHERE id=$2`,
        [qty, mat.inventory_item_id]
      ).catch(e => console.log("inventory deduct on use:", e.message));
    }

    // Log it
    await pool.query(
      `INSERT INTO material_usage_log (material_id, project_id, qty_used, note, used_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, project_id || mat.project_id, qty, note || null, user?.name || "Unknown"]
    );

    // Return updated with computed fields
    const updated = await pool.query(
      `SELECT m.*,
              GREATEST(0, m.qty_ordered - m.qty_used) AS qty_remaining,
              m.qty_ordered * m.unit_cost              AS total_cost,
              m.qty_used    * m.unit_cost              AS cost_used,
              CASE WHEN GREATEST(0, m.qty_ordered - m.qty_used) <= m.low_stock_threshold
                   THEN true ELSE false END            AS is_low_stock
       FROM materials m WHERE m.id=$1`,
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST — restock (add more quantity)
router.post("/:id/restock", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { qty } = req.body;
    if (!qty || qty <= 0) return res.status(400).json({ message: "qty must be > 0" });
    await pool.query(
      `UPDATE materials SET qty_ordered = qty_ordered + $1, updated_at=NOW() WHERE id=$2`,
      [qty, req.params.id]
    );
    const updated = await pool.query(
      `SELECT m.*,
              GREATEST(0, m.qty_ordered - m.qty_used) AS qty_remaining,
              m.qty_ordered * m.unit_cost              AS total_cost,
              m.qty_used    * m.unit_cost              AS cost_used,
              CASE WHEN GREATEST(0, m.qty_ordered - m.qty_used) <= m.low_stock_threshold
                   THEN true ELSE false END            AS is_low_stock
       FROM materials m WHERE m.id=$1`,
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM materials WHERE id=$1`, [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

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

// ── Create tables ─────────────────────────────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS inventory_items (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    sku             VARCHAR(100),
    category        VARCHAR(100) DEFAULT 'Materials',
    unit            VARCHAR(50)  NOT NULL DEFAULT 'units',
    qty_in_stock    NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit_cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
    reorder_level   NUMERIC(12,2) NOT NULL DEFAULT 10,
    supplier        VARCHAR(200),
    supplier_contact VARCHAR(200),
    location        VARCHAR(200),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id              SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL,
    type            VARCHAR(30) NOT NULL, -- 'receive','allocate','adjust','return'
    qty             NUMERIC(14,2) NOT NULL,
    project_id      INTEGER,
    reference       VARCHAR(200),   -- PO number, project title, etc
    note            TEXT,
    done_by         VARCHAR(200),
    created_at      TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS inventory_allocations (
    id                  SERIAL PRIMARY KEY,
    inventory_item_id   INTEGER NOT NULL,
    project_id          INTEGER NOT NULL,
    material_id         INTEGER,        -- references materials.id (created/updated on allocate)
    qty_allocated       NUMERIC(14,2) NOT NULL DEFAULT 0,
    allocated_by        VARCHAR(200),
    allocated_at        TIMESTAMP DEFAULT NOW()
  );
`).catch(e => console.log("inventory tables:", e.message));

// Add inventory_item_id to materials if missing
pool.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER`)
  .catch(() => {});

// ── Helpers ───────────────────────────────────────────────────────────────────
const withComputed = `
  SELECT i.*,
    CASE WHEN i.qty_in_stock <= i.reorder_level THEN true ELSE false END AS is_low_stock,
    i.qty_in_stock * i.unit_cost AS total_value
  FROM inventory_items i
`;

// ── GET /api/inventory — all items ───────────────────────────────────────────
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(`${withComputed} ORDER BY i.category, i.name`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /api/inventory/summary — KPI totals ───────────────────────────────────
router.get("/summary", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*)                                          AS total_items,
        SUM(qty_in_stock * unit_cost)                    AS total_value,
        COUNT(*) FILTER (WHERE qty_in_stock <= reorder_level) AS low_stock_count,
        COUNT(DISTINCT category)                          AS categories
      FROM inventory_items
    `);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /api/inventory/low-stock ──────────────────────────────────────────────
router.get("/low-stock", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(`
      ${withComputed} WHERE i.qty_in_stock <= i.reorder_level ORDER BY i.qty_in_stock ASC
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /api/inventory/project/:projectId — items allocated to a project ──────
router.get("/project/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(`
      SELECT ia.*, i.name AS item_name, i.unit, i.unit_cost, i.category, i.qty_in_stock
      FROM inventory_allocations ia
      JOIN inventory_items i ON i.id = ia.inventory_item_id
      WHERE ia.project_id = $1
      ORDER BY ia.allocated_at DESC
    `, [req.params.projectId]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /api/inventory/:id/transactions ───────────────────────────────────────
router.get("/:id/transactions", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(`
      SELECT t.*, p.title AS project_title
      FROM inventory_transactions t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.inventory_item_id = $1
      ORDER BY t.created_at DESC LIMIT 100
    `, [req.params.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/inventory — create item ─────────────────────────────────────────
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { name, sku, category, unit, qty_in_stock, unit_cost, reorder_level, supplier, supplier_contact, location, notes } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });
    const r = await pool.query(`
      INSERT INTO inventory_items (name, sku, category, unit, qty_in_stock, unit_cost, reorder_level, supplier, supplier_contact, location, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [name, sku||null, category||"Materials", unit||"units",
        qty_in_stock||0, unit_cost||0, reorder_level||10,
        supplier||null, supplier_contact||null, location||null, notes||null]);
    // Log initial stock if any
    if (qty_in_stock > 0) {
      await pool.query(`
        INSERT INTO inventory_transactions (inventory_item_id, type, qty, note, done_by)
        VALUES ($1,'receive',$2,'Initial stock entry',$3)
      `, [r.rows[0].id, qty_in_stock, user.name]);
    }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /api/inventory/:id — update item ──────────────────────────────────────
router.put("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { name, sku, category, unit, unit_cost, reorder_level, supplier, supplier_contact, location, notes } = req.body;
    const r = await pool.query(`
      UPDATE inventory_items SET name=$1, sku=$2, category=$3, unit=$4, unit_cost=$5,
        reorder_level=$6, supplier=$7, supplier_contact=$8, location=$9, notes=$10, updated_at=NOW()
      WHERE id=$11 RETURNING *
    `, [name, sku||null, category||"Materials", unit||"units", unit_cost||0,
        reorder_level||10, supplier||null, supplier_contact||null, location||null, notes||null, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/inventory/:id/receive — add stock (from PO, delivery, etc.) ─────
router.post("/:id/receive", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { qty, note, reference } = req.body;
    if (!qty || qty <= 0) return res.status(400).json({ message: "qty must be > 0" });
    await pool.query(`
      UPDATE inventory_items SET qty_in_stock = qty_in_stock + $1, updated_at=NOW() WHERE id=$2
    `, [qty, req.params.id]);
    await pool.query(`
      INSERT INTO inventory_transactions (inventory_item_id, type, qty, reference, note, done_by)
      VALUES ($1,'receive',$2,$3,$4,$5)
    `, [req.params.id, qty, reference||null, note||null, user.name]);
    const updated = await pool.query(`${withComputed} WHERE i.id=$1`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/inventory/:id/allocate — allocate qty to project ───────────────
// This is THE CORE SYNC: inventory → project materials
router.post("/:id/allocate", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { qty, project_id, note } = req.body;
    if (!qty || qty <= 0) return res.status(400).json({ message: "qty must be > 0" });
    if (!project_id)      return res.status(400).json({ message: "project_id required" });

    // Get inventory item details
    const itemR = await pool.query(`SELECT * FROM inventory_items WHERE id=$1`, [req.params.id]);
    if (!itemR.rows[0]) return res.status(404).json({ message: "Item not found" });
    const item = itemR.rows[0];

    if (item.qty_in_stock < qty) {
      return res.status(400).json({ message: `Only ${item.qty_in_stock} ${item.unit} available in stock` });
    }

    // Deduct from central inventory
    await pool.query(`
      UPDATE inventory_items SET qty_in_stock = qty_in_stock - $1, updated_at=NOW() WHERE id=$2
    `, [qty, req.params.id]);

    // Get project name for reference
    const projR = await pool.query(`SELECT title FROM projects WHERE id=$1`, [project_id]);
    const projTitle = projR.rows[0]?.title || `Project #${project_id}`;

    // Log transaction
    await pool.query(`
      INSERT INTO inventory_transactions (inventory_item_id, type, qty, project_id, reference, note, done_by)
      VALUES ($1,'allocate',$2,$3,$4,$5,$6)
    `, [req.params.id, qty, project_id, projTitle, note||null, user.name]);

    // Check if project already has this material (from same inventory item)
    const existingMat = await pool.query(`
      SELECT * FROM materials WHERE project_id=$1 AND inventory_item_id=$2 LIMIT 1
    `, [project_id, req.params.id]);

    let materialId;
    if (existingMat.rows[0]) {
      // Update existing project material — add stock
      await pool.query(`
        UPDATE materials SET qty_ordered = qty_ordered + $1, updated_at=NOW() WHERE id=$2
      `, [qty, existingMat.rows[0].id]);
      materialId = existingMat.rows[0].id;
    } else {
      // Create new project material linked to this inventory item
      const newMat = await pool.query(`
        INSERT INTO materials (project_id, name, unit, qty_ordered, unit_cost, supplier, low_stock_threshold, inventory_item_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
      `, [project_id, item.name, item.unit, qty, item.unit_cost,
          item.supplier||null, item.reorder_level, req.params.id]);
      materialId = newMat.rows[0].id;
    }

    // Record allocation
    await pool.query(`
      INSERT INTO inventory_allocations (inventory_item_id, project_id, material_id, qty_allocated, allocated_by)
      VALUES ($1,$2,$3,$4,$5)
    `, [req.params.id, project_id, materialId, qty, user.name]);

    const updated = await pool.query(`${withComputed} WHERE i.id=$1`, [req.params.id]);
    res.json({ success: true, item: updated.rows[0], material_id: materialId, project_title: projTitle });
  } catch (e) { console.log(e.message); res.status(500).json({ message: e.message }); }
});

// ── POST /api/inventory/:id/return — return unused qty from project ────────────
router.post("/:id/return", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { qty, project_id, note } = req.body;
    if (!qty || qty <= 0) return res.status(400).json({ message: "qty must be > 0" });
    await pool.query(`
      UPDATE inventory_items SET qty_in_stock = qty_in_stock + $1, updated_at=NOW() WHERE id=$2
    `, [qty, req.params.id]);
    // Reduce project material qty_ordered
    if (project_id) {
      await pool.query(`
        UPDATE materials SET qty_ordered = GREATEST(0, qty_ordered - $1), updated_at=NOW()
        WHERE project_id=$2 AND inventory_item_id=$3
      `, [qty, project_id, req.params.id]);
    }
    await pool.query(`
      INSERT INTO inventory_transactions (inventory_item_id, type, qty, project_id, note, done_by)
      VALUES ($1,'return',$2,$3,$4,$5)
    `, [req.params.id, qty, project_id||null, note||null, user.name]);
    const updated = await pool.query(`${withComputed} WHERE i.id=$1`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── DELETE /api/inventory/:id ─────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM inventory_transactions WHERE inventory_item_id=$1`, [req.params.id]);
    await pool.query(`DELETE FROM inventory_allocations WHERE inventory_item_id=$1`, [req.params.id]);
    await pool.query(`DELETE FROM inventory_items WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

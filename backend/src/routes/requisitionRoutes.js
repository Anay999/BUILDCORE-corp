const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

pool.query(`
  CREATE TABLE IF NOT EXISTS material_requisitions (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER,
    requested_by INTEGER NOT NULL,
    item_name    VARCHAR(300) NOT NULL,
    quantity     NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit         VARCHAR(50) DEFAULT 'units',
    estimated_cost NUMERIC(12,2),
    vendor_name  VARCHAR(200),
    purpose      TEXT,
    required_by  DATE,
    status       VARCHAR(30) DEFAULT 'pending',
    approved_by  INTEGER,
    approved_at  TIMESTAMP,
    reject_reason TEXT,
    po_id        INTEGER,
    created_at   TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("material_requisitions table:", e.message));

// GET all requisitions
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT mr.*, u.name AS requested_by_name, a.name AS approved_by_name, p.title AS project_title
       FROM material_requisitions mr
       JOIN users u ON mr.requested_by = u.id
       LEFT JOIN users a ON mr.approved_by = a.id
       LEFT JOIN projects p ON mr.project_id = p.id
       ORDER BY mr.created_at DESC`
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET by project
router.get("/project/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT mr.*, u.name AS requested_by_name, a.name AS approved_by_name
       FROM material_requisitions mr
       JOIN users u ON mr.requested_by = u.id
       LEFT JOIN users a ON mr.approved_by = a.id
       WHERE mr.project_id = $1 ORDER BY mr.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// POST — create requisition
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const { project_id, item_name, quantity, unit, estimated_cost, vendor_name, purpose, required_by } = req.body;
  if (!item_name) return res.status(400).json({ message: "item_name required" });
  try {
    const r = await pool.query(
      `INSERT INTO material_requisitions (project_id, requested_by, item_name, quantity, unit, estimated_cost, vendor_name, purpose, required_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [project_id || null, user.id, item_name, quantity || 1, unit || "units",
       estimated_cost || null, vendor_name || null, purpose || null, required_by || null]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /:id/approve — approve and auto-create PO
router.patch("/:id/approve", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const rq = await pool.query(`SELECT * FROM material_requisitions WHERE id=$1`, [req.params.id]);
    if (!rq.rows[0]) return res.status(404).json({ message: "Not found" });
    const req2 = rq.rows[0];

    // Update status
    await pool.query(
      `UPDATE material_requisitions SET status='approved', approved_by=$1, approved_at=NOW() WHERE id=$2`,
      [user.id, req.params.id]
    );

    // Auto-create PO
    let po = null;
    try {
      const cnt = await pool.query("SELECT COUNT(*) FROM purchase_orders");
      const poNum = `PO-${new Date().getFullYear()}-${String(parseInt(cnt.rows[0].count)+1).padStart(4,"0")}`;
      const poR = await pool.query(
        `INSERT INTO purchase_orders (project_id, raised_by, po_number, vendor_name, description, category, amount, status, expected_date)
         VALUES ($1,$2,$3,$4,$5,'Materials',$6,'pending',$7) RETURNING *`,
        [req2.project_id, user.id, poNum, req2.vendor_name || "TBD",
         `Requisition: ${req2.item_name} x${req2.quantity} ${req2.unit}`,
         req2.estimated_cost || 0, req2.required_by || null]
      );
      po = poR.rows[0];
      await pool.query(`UPDATE material_requisitions SET po_id=$1 WHERE id=$2`, [po.id, req.params.id]);
    } catch (poErr) { console.log("auto-PO:", poErr.message); }

    res.json({ message: "Approved", po });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /:id/reject
router.patch("/:id/reject", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const { reason } = req.body;
  try {
    await pool.query(
      `UPDATE material_requisitions SET status='rejected', approved_by=$1, approved_at=NOW(), reject_reason=$2 WHERE id=$3`,
      [user.id, reason || null, req.params.id]
    );
    res.json({ message: "Rejected" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// DELETE
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM material_requisitions WHERE id=$1`, [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

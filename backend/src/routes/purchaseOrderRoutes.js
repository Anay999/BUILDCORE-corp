const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

pool.query(`
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id            SERIAL PRIMARY KEY,
    project_id    INTEGER,
    raised_by     INTEGER NOT NULL,
    po_number     VARCHAR(50),
    vendor_name   VARCHAR(200) NOT NULL,
    description   TEXT NOT NULL,
    category      VARCHAR(100) DEFAULT 'Materials',
    amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'draft',
    approved_by   INTEGER,
    approved_at   TIMESTAMP,
    expected_date DATE,
    received_date DATE,
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("purchase_orders table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// Auto-generate PO number
const genPoNumber = async () => {
  const r = await pool.query("SELECT COUNT(*) FROM purchase_orders");
  const n = parseInt(r.rows[0].count) + 1;
  return `PO-${new Date().getFullYear()}-${String(n).padStart(4,"0")}`;
};

// GET /api/purchase-orders  — all POs (company-wide)
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT po.*, u.name AS raised_by_name,
         ap.name AS approved_by_name,
         p.title AS project_title
       FROM purchase_orders po
       JOIN users u ON po.raised_by = u.id
       LEFT JOIN users ap ON po.approved_by = ap.id
       LEFT JOIN projects p ON po.project_id = p.id
       ORDER BY po.created_at DESC`
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET /api/purchase-orders/project/:projectId  — POs for one project
router.get("/project/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT po.*, u.name AS raised_by_name, ap.name AS approved_by_name
       FROM purchase_orders po
       JOIN users u ON po.raised_by = u.id
       LEFT JOIN users ap ON po.approved_by = ap.id
       WHERE po.project_id = $1
       ORDER BY po.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/purchase-orders
router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, raised_by, vendor_name, description, category, amount, expected_date, notes } = req.body;
    const po_number = await genPoNumber();
    const r = await pool.query(
      `INSERT INTO purchase_orders (project_id, raised_by, po_number, vendor_name, description, category, amount, expected_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [project_id || null, raised_by, po_number, vendor_name, description,
       category || "Materials", amount || 0, expected_date || null, notes || null]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /api/purchase-orders/:id/submit  — draft → pending (any auth user)
router.patch("/:id/submit", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `UPDATE purchase_orders SET status='pending', updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// PATCH /api/purchase-orders/:id/approve
router.patch("/:id/approve", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!["boss","manager"].includes(user.role)) return res.status(403).json({ message: "Forbidden" });
  try {
    const r = await pool.query(
      `UPDATE purchase_orders SET status='approved', approved_by=$1, approved_at=NOW(), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [user.id, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// PATCH /api/purchase-orders/:id/reject
router.patch("/:id/reject", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!["boss","manager"].includes(user.role)) return res.status(403).json({ message: "Forbidden" });
  try {
    const r = await pool.query(
      `UPDATE purchase_orders SET status='rejected', approved_by=$1, approved_at=NOW(), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [user.id, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// PATCH /api/purchase-orders/:id/receive  — mark received + auto-create expense
router.patch("/:id/receive", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `UPDATE purchase_orders SET status='received', received_date=CURRENT_DATE, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    const po = r.rows[0];
    if (!po) return res.status(404).json({ message: "PO not found" });

    // Auto-create expense for the project (if linked to a project)
    if (po.project_id) {
      await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(200)`).catch(()=>{});
      await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source_po_id INTEGER`).catch(()=>{});
      const existing = await pool.query(`SELECT id FROM expenses WHERE source_po_id=$1`, [po.id]);
      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO expenses (project_id, added_by, category, description, amount, date, vendor_name, source_po_id)
          VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7)
        `, [po.project_id, user.id,
            po.category || "Materials",
            `PO ${po.po_number}: ${po.description}`,
            po.amount, po.vendor_name, po.id]);
      }
    }

    res.json({ ...po, expense_auto_created: !!po.project_id });
  } catch (e) { console.log("PO receive error:", e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/purchase-orders/:id
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM purchase_orders WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

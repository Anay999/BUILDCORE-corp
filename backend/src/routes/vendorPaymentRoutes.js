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
  CREATE TABLE IF NOT EXISTS vendor_payments (
    id            SERIAL PRIMARY KEY,
    vendor_id     INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    po_id         INTEGER,
    contract_id   INTEGER,
    amount        NUMERIC(14,2) NOT NULL,
    payment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode  VARCHAR(50) DEFAULT 'Bank Transfer',
    reference     VARCHAR(200),
    notes         TEXT,
    recorded_by   INTEGER,
    created_at    TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("vendor_payments table:", e.message));

// GET all payments for a vendor
router.get("/vendor/:vendorId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT vp.*, u.name AS recorded_by_name,
              po.po_number, po.description AS po_desc,
              c.title AS contract_title
       FROM vendor_payments vp
       LEFT JOIN users u ON vp.recorded_by = u.id
       LEFT JOIN purchase_orders po ON vp.po_id = po.id
       LEFT JOIN contracts c ON vp.contract_id = c.id
       WHERE vp.vendor_id = $1
       ORDER BY vp.payment_date DESC`,
      [req.params.vendorId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET ledger summary for a vendor
router.get("/vendor/:vendorId/summary", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const [totalSpend, totalPaid] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM purchase_orders WHERE LOWER(vendor_name)=(SELECT LOWER(name) FROM vendors WHERE id=$1) AND status IN ('approved','received')`, [req.params.vendorId]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS paid FROM vendor_payments WHERE vendor_id=$1`, [req.params.vendorId])
    ]);
    const spend = Number(totalSpend.rows[0].total);
    const paid = Number(totalPaid.rows[0].paid);
    res.json({ totalPoValue: spend, totalPaid: paid, outstanding: Math.max(0, spend - paid) });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// POST — record payment
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const { vendor_id, po_id, contract_id, amount, payment_date, payment_mode, reference, notes } = req.body;
  if (!vendor_id || !amount) return res.status(400).json({ message: "vendor_id and amount required" });
  try {
    const r = await pool.query(
      `INSERT INTO vendor_payments (vendor_id, po_id, contract_id, amount, payment_date, payment_mode, reference, notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [vendor_id, po_id || null, contract_id || null, amount,
       payment_date || new Date().toISOString().split("T")[0],
       payment_mode || "Bank Transfer", reference || null, notes || null, user.id]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM vendor_payments WHERE id=$1`, [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

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
  CREATE TABLE IF NOT EXISTS contract_payments (
    id           SERIAL PRIMARY KEY,
    contract_id  INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    amount       NUMERIC(14,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
    reference    VARCHAR(200),
    milestone    VARCHAR(300),
    notes        TEXT,
    recorded_by  INTEGER,
    created_at   TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("contract_payments table:", e.message));

// GET payments for a contract
router.get("/contract/:contractId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT cp.*, u.name AS recorded_by_name
       FROM contract_payments cp
       LEFT JOIN users u ON cp.recorded_by = u.id
       WHERE cp.contract_id = $1 ORDER BY cp.payment_date DESC`,
      [req.params.contractId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// GET summary for a contract
router.get("/contract/:contractId/summary", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const [contract, payments] = await Promise.all([
      pool.query(`SELECT contract_value FROM contracts WHERE id=$1`, [req.params.contractId]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS paid FROM contract_payments WHERE contract_id=$1`, [req.params.contractId])
    ]);
    const contractValue = Number(contract.rows[0]?.contract_value || 0);
    const paid = Number(payments.rows[0].paid);
    res.json({ contractValue, paid, outstanding: contractValue - paid, pctPaid: contractValue > 0 ? Math.round((paid/contractValue)*100) : 0 });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// POST — record a payment
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const { contract_id, amount, payment_date, payment_mode, reference, milestone, notes } = req.body;
  if (!contract_id || !amount) return res.status(400).json({ message: "contract_id and amount required" });
  try {
    const r = await pool.query(
      `INSERT INTO contract_payments (contract_id, amount, payment_date, payment_mode, reference, milestone, notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [contract_id, amount, payment_date || new Date().toISOString().split("T")[0],
       payment_mode || "Bank Transfer", reference || null, milestone || null, notes || null, user.id]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM contract_payments WHERE id=$1`, [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

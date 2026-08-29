const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const jwt     = require("jsonwebtoken");
const { broadcast } = require("../utils/broadcast");

// Auto-create tables on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS subcontractors (
    id             SERIAL PRIMARY KEY,
    project_id     INTEGER NOT NULL,
    company_name   VARCHAR(200) NOT NULL,
    contact_name   VARCHAR(150),
    phone          VARCHAR(30),
    email          VARCHAR(150),
    trade          VARCHAR(100) NOT NULL DEFAULT 'General',
    contract_value NUMERIC(14,2) DEFAULT 0,
    amount_paid    NUMERIC(14,2) DEFAULT 0,
    status         VARCHAR(20)  NOT NULL DEFAULT 'active',
    start_date     DATE,
    end_date       DATE,
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("subcontractors table:", e.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS subcontractor_payments (
    id                SERIAL PRIMARY KEY,
    subcontractor_id  INTEGER NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
    project_id        INTEGER NOT NULL,
    amount            NUMERIC(14,2) NOT NULL,
    payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method    VARCHAR(50) DEFAULT 'bank_transfer',
    reference         VARCHAR(150),
    notes             TEXT,
    paid_by           INTEGER REFERENCES users(id),
    paid_by_name      VARCHAR(150),
    created_at        TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("subcontractor_payments table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// GET /api/subcontractors/:projectId
router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT * FROM subcontractors WHERE project_id = $1 ORDER BY created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// POST /api/subcontractors
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const {
      project_id,
      company_name, name,
      contact_name, contact,
      phone, email, trade,
      contract_value, daily_rate,
      start_date, end_date, notes, status
    } = req.body;
    const finalName  = company_name || name;
    const finalContact = contact_name || contact;
    const finalValue = parseFloat(contract_value ?? daily_rate ?? 0) || 0;
    if (!project_id || !finalName) return res.status(400).json({ message: "project_id and company_name required" });
    const r = await pool.query(
      `INSERT INTO subcontractors
        (project_id, company_name, contact_name, phone, email, trade, contract_value, start_date, end_date, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [project_id, finalName, finalContact || null, phone || null, email || null,
       trade || "General", finalValue, start_date || null, end_date || null, notes || null, status || "active"]
    );
    broadcast("project_update", { action: "sub_added", project_id });
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH /api/subcontractors/:id
router.patch("/:id", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { status, notes, contract_value, company_name, trade, contact_name, phone, email } = req.body;
    const r = await pool.query(
      `UPDATE subcontractors
       SET company_name   = COALESCE($1, company_name),
           trade          = COALESCE($2, trade),
           contact_name   = COALESCE($3, contact_name),
           phone          = COALESCE($4, phone),
           email          = COALESCE($5, email),
           contract_value = COALESCE($6, contract_value),
           status         = COALESCE($7, status),
           notes          = COALESCE($8, notes),
           updated_at     = NOW()
       WHERE id = $9 RETURNING *`,
      [company_name ?? null, trade || null, contact_name ?? null, phone ?? null, email ?? null,
       contract_value ?? null, status || null, notes ?? null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/subcontractors/:id
router.delete("/:id", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!["boss", "manager"].includes(user.role)) return res.status(403).json({ message: "Forbidden" });
  try {
    await pool.query("DELETE FROM subcontractors WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// GET /api/subcontractors/:id/payments
router.get("/:id/payments", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT * FROM subcontractor_payments WHERE subcontractor_id = $1 ORDER BY payment_date DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/subcontractors/:id/payments
router.post("/:id/payments", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { amount, payment_date, payment_method, reference, notes } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ message: "Amount required" });

    const subR = await pool.query(`SELECT * FROM subcontractors WHERE id = $1`, [req.params.id]);
    if (!subR.rows[0]) return res.status(404).json({ message: "Subcontractor not found" });
    const sub = subR.rows[0];

    const payR = await pool.query(
      `INSERT INTO subcontractor_payments
        (subcontractor_id, project_id, amount, payment_date, payment_method, reference, notes, paid_by, paid_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [sub.id, sub.project_id, parseFloat(amount),
       payment_date || new Date().toISOString().split("T")[0],
       payment_method || "bank_transfer", reference || null, notes || null, user.id, user.name]
    );

    // Recalculate total from all payment records
    const totR = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM subcontractor_payments WHERE subcontractor_id = $1`,
      [sub.id]
    );
    const newTotal = parseFloat(totR.rows[0].total);
    await pool.query(`UPDATE subcontractors SET amount_paid=$1, updated_at=NOW() WHERE id=$2`, [newTotal, sub.id]);

    // Auto-complete if fully paid
    if (newTotal >= parseFloat(sub.contract_value) && sub.status === "active") {
      await pool.query(`UPDATE subcontractors SET status='completed', updated_at=NOW() WHERE id=$1`, [sub.id]);
    }

    broadcast("project_update", { action: "sub_payment", project_id: sub.project_id });
    res.json({ payment: payR.rows[0], amount_paid: newTotal });
  } catch (e) { console.log(e.message); res.status(500).json({ message: e.message }); }
});

module.exports = router;

const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// Create table with retention columns
pool.query(`
  CREATE TABLE IF NOT EXISTS invoices (
    id                     SERIAL PRIMARY KEY,
    project_id             INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    invoice_number         TEXT NOT NULL,
    title                  TEXT NOT NULL,
    amount                 NUMERIC(14,2) NOT NULL DEFAULT 0,
    retention_pct          NUMERIC(5,2)  DEFAULT 0,
    retention_amount       NUMERIC(14,2) DEFAULT 0,
    retention_released     BOOLEAN       DEFAULT FALSE,
    retention_released_date DATE,
    status                 TEXT NOT NULL DEFAULT 'draft',
    due_date               DATE,
    issued_date            DATE DEFAULT CURRENT_DATE,
    paid_date              DATE,
    notes                  TEXT,
    created_by             INTEGER REFERENCES users(id),
    created_at             TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => console.log("Invoices table:", e.message));

// Add retention columns to existing table if missing
pool.query(`
  ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS retention_pct           NUMERIC(5,2)  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS retention_amount        NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS retention_released      BOOLEAN       DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS retention_released_date DATE
`).catch(() => {});

// GET /api/invoices/:projectId
router.get("/:projectId", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT i.*, u.name AS created_by_name
       FROM invoices i
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.project_id = $1
       ORDER BY i.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/invoices
router.post("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { project_id, title, amount, due_date, issued_date, notes, invoice_number, retention_pct } = req.body;
  try {
    const invNo   = invoice_number || `INV-${Date.now().toString().slice(-6)}`;
    const retPct  = parseFloat(retention_pct || 0);
    const retAmt  = retPct > 0 ? parseFloat(amount || 0) * retPct / 100 : 0;
    const r = await pool.query(
      `INSERT INTO invoices
        (project_id, invoice_number, title, amount, retention_pct, retention_amount, due_date, issued_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [project_id, invNo, title, amount || 0, retPct, retAmt,
       due_date || null, issued_date || null, notes || null, userId]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/invoices/:id
router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { status, paid_date, title, amount, due_date, notes, retention_pct } = req.body;
  try {
    const fields = []; const vals = []; let idx = 1;
    if (title          !== undefined) { fields.push(`title=$${idx++}`);         vals.push(title); }
    if (amount         !== undefined) {
      fields.push(`amount=$${idx++}`); vals.push(amount);
      // recalculate retention_amount if amount changes
      const retPct = retention_pct !== undefined ? parseFloat(retention_pct) : null;
      if (retPct !== null) {
        fields.push(`retention_pct=$${idx++}`);    vals.push(retPct);
        fields.push(`retention_amount=$${idx++}`); vals.push(parseFloat(amount) * retPct / 100);
      }
    } else if (retention_pct !== undefined) {
      // retention_pct changed without amount change — recalculate from current amount
      const amtR = await pool.query(`SELECT amount FROM invoices WHERE id=$1`, [req.params.id]);
      const curAmt = parseFloat(amtR.rows[0]?.amount || 0);
      const retPct = parseFloat(retention_pct);
      fields.push(`retention_pct=$${idx++}`);    vals.push(retPct);
      fields.push(`retention_amount=$${idx++}`); vals.push(curAmt * retPct / 100);
    }
    if (due_date !== undefined) { fields.push(`due_date=$${idx++}`); vals.push(due_date); }
    if (notes    !== undefined) { fields.push(`notes=$${idx++}`);    vals.push(notes); }
    if (status   !== undefined) {
      fields.push(`status=$${idx++}`); vals.push(status);
      if (status === "paid") { fields.push(`paid_date=$${idx++}`); vals.push(paid_date || new Date().toISOString().split("T")[0]); }
    }
    if (!fields.length) return res.status(400).json({ message: "Nothing to update" });
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE invoices SET ${fields.join(",")} WHERE id=$${idx} RETURNING *`, vals);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/invoices/:id/release-retention
router.patch("/:id/release-retention", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `UPDATE invoices
       SET retention_released=TRUE, retention_released_date=CURRENT_DATE
       WHERE id=$1 AND retention_released=FALSE
       RETURNING *`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: "Invoice not found or retention already released" });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/invoices/:id
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM invoices WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

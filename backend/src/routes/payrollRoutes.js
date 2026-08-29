const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Ensure tables
const ensureTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payroll_salaries (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      base_salary NUMERIC(12,2) DEFAULT 0,
      hra NUMERIC(12,2) DEFAULT 0,
      transport NUMERIC(12,2) DEFAULT 0,
      other_allowances NUMERIC(12,2) DEFAULT 0,
      pf_deduction NUMERIC(12,2) DEFAULT 0,
      esi_deduction NUMERIC(12,2) DEFAULT 0,
      tds_deduction NUMERIC(12,2) DEFAULT 0,
      other_deductions NUMERIC(12,2) DEFAULT 0,
      effective_from DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id)
    );
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      month INT NOT NULL,
      year INT NOT NULL,
      working_days INT DEFAULT 26,
      present_days INT DEFAULT 26,
      basic_pay NUMERIC(12,2) DEFAULT 0,
      hra NUMERIC(12,2) DEFAULT 0,
      transport NUMERIC(12,2) DEFAULT 0,
      other_allowances NUMERIC(12,2) DEFAULT 0,
      gross_pay NUMERIC(12,2) DEFAULT 0,
      pf_deduction NUMERIC(12,2) DEFAULT 0,
      esi_deduction NUMERIC(12,2) DEFAULT 0,
      tds_deduction NUMERIC(12,2) DEFAULT 0,
      other_deductions NUMERIC(12,2) DEFAULT 0,
      total_deductions NUMERIC(12,2) DEFAULT 0,
      net_pay NUMERIC(12,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      paid_on DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, month, year)
    );
  `);
};
ensureTables().catch(e => console.log("payroll tables:", e.message));

// GET /api/payroll/salaries
router.get("/salaries", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT ps.*, u.name, u.email, u.role 
      FROM payroll_salaries ps 
      JOIN users u ON u.id = ps.user_id 
      ORDER BY u.name
    `);
    res.json(r.rows);
  } catch(e) { res.json([]); }
});

// PUT /api/payroll/salaries/:userId
router.put("/salaries/:userId", async (req, res) => {
  const { base_salary, hra, transport, other_allowances, pf_deduction, esi_deduction, tds_deduction, other_deductions } = req.body;
  try {
    const r = await pool.query(`
      INSERT INTO payroll_salaries (user_id, base_salary, hra, transport, other_allowances, pf_deduction, esi_deduction, tds_deduction, other_deductions)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id) DO UPDATE SET
        base_salary=$2, hra=$3, transport=$4, other_allowances=$5,
        pf_deduction=$6, esi_deduction=$7, tds_deduction=$8, other_deductions=$9
      RETURNING *
    `, [req.params.userId, base_salary||0, hra||0, transport||0, other_allowances||0, pf_deduction||0, esi_deduction||0, tds_deduction||0, other_deductions||0]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// GET /api/payroll/runs?month=&year=
router.get("/runs", async (req, res) => {
  const { month, year } = req.query;
  try {
    const r = await pool.query(`
      SELECT pr.*, u.name, u.email, u.role 
      FROM payroll_runs pr 
      JOIN users u ON u.id = pr.user_id 
      WHERE pr.month=$1 AND pr.year=$2
      ORDER BY u.name
    `, [month, year]);
    res.json(r.rows);
  } catch(e) { res.json([]); }
});

// POST /api/payroll/runs/generate — generate payroll for month/year
router.post("/runs/generate", async (req, res) => {
  const { month, year } = req.body;
  try {
    const salaries = await pool.query(`SELECT ps.*, u.name FROM payroll_salaries ps JOIN users u ON u.id=ps.user_id`);
    const results = [];
    for (const s of salaries.rows) {
      const gross = parseFloat(s.base_salary) + parseFloat(s.hra) + parseFloat(s.transport) + parseFloat(s.other_allowances);
      const deductions = parseFloat(s.pf_deduction) + parseFloat(s.esi_deduction) + parseFloat(s.tds_deduction) + parseFloat(s.other_deductions);
      const net = gross - deductions;
      const r = await pool.query(`
        INSERT INTO payroll_runs (user_id, month, year, basic_pay, hra, transport, other_allowances, gross_pay, pf_deduction, esi_deduction, tds_deduction, other_deductions, total_deductions, net_pay, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft')
        ON CONFLICT (user_id, month, year) DO UPDATE SET
          basic_pay=$4, hra=$5, transport=$6, other_allowances=$7, gross_pay=$8,
          pf_deduction=$9, esi_deduction=$10, tds_deduction=$11, other_deductions=$12,
          total_deductions=$13, net_pay=$14
        RETURNING *
      `, [s.user_id, month, year, s.base_salary, s.hra, s.transport, s.other_allowances, gross, s.pf_deduction, s.esi_deduction, s.tds_deduction, s.other_deductions, deductions, net]);
      results.push(r.rows[0]);
    }
    res.json({ success: true, count: results.length, runs: results });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/payroll/runs/month?month=&year= — clear all runs for a month (must be before :id route)
router.delete("/runs/month", async (req, res) => {
  const { month, year } = req.query;
  try {
    const r = await pool.query(`DELETE FROM payroll_runs WHERE month=$1 AND year=$2`, [month, year]);
    res.json({ success: true, count: r.rowCount });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/payroll/runs/:id — delete a single payroll run
router.delete("/runs/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM payroll_runs WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/payroll/runs/:id/pay
router.patch("/runs/:id/pay", async (req, res) => {
  try {
    const r = await pool.query(`UPDATE payroll_runs SET status='paid', paid_on=CURRENT_DATE WHERE id=$1 RETURNING *`, [req.params.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/payroll/runs/:id/days — update present days (prorated)
router.patch("/runs/:id/days", async (req, res) => {
  const { present_days, working_days } = req.body;
  try {
    const run = await pool.query(`SELECT * FROM payroll_runs WHERE id=$1`, [req.params.id]);
    if (!run.rows[0]) return res.status(404).json({ message: "Not found" });
    const r2 = run.rows[0];
    const ratio = present_days / Math.max(working_days, 1);
    const gross = (parseFloat(r2.basic_pay) + parseFloat(r2.hra) + parseFloat(r2.transport) + parseFloat(r2.other_allowances)) * ratio;
    const deductions = parseFloat(r2.total_deductions) * ratio;
    const net = gross - deductions;
    const updated = await pool.query(`
      UPDATE payroll_runs SET present_days=$1, working_days=$2, gross_pay=$3, net_pay=$4 WHERE id=$5 RETURNING *
    `, [present_days, working_days, gross.toFixed(2), net.toFixed(2), req.params.id]);
    res.json(updated.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

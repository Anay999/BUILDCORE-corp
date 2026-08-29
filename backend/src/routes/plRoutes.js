const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

// ── Tables ─────────────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS revenue_milestones (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER NOT NULL,
    title        VARCHAR(200) NOT NULL,
    amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
    due_date     DATE,
    received     BOOLEAN DEFAULT false,
    received_at  TIMESTAMP,
    notes        TEXT,
    created_at   TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("revenue_milestones table:", e.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS worker_rates (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    daily_rate  NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
  )
`).catch(e => console.log("worker_rates table:", e.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS pl_settings (
    id                    SERIAL PRIMARY KEY,
    project_id            INTEGER UNIQUE NOT NULL,
    contract_value        NUMERIC(14,2) DEFAULT 0,
    margin_alert_threshold NUMERIC(5,2) DEFAULT 15,
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("pl_settings table:", e.message));

// ── Auth helper ────────────────────────────────────────────────────────────

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

// ── Company-wide P&L ───────────────────────────────────────────────────────
// MUST be before /:projectId so Express doesn't match "company" as a project id

// GET /api/pl/company/summary
router.get("/company/summary", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const projectsRes = await pool.query(`SELECT id, title, status, budget FROM projects ORDER BY id`);
    const projects = projectsRes.rows;

    const rows = await Promise.all(projects.map(async (p) => {
      const pid = p.id;

      const settingsRes = await pool.query(`SELECT contract_value, margin_alert_threshold FROM pl_settings WHERE project_id=$1`, [pid]);
      const contractValue = Number(settingsRes.rows[0]?.contract_value) || 0;
      const alertThreshold = Number(settingsRes.rows[0]?.margin_alert_threshold) || 15;

      const milRes = await pool.query(`SELECT COALESCE(SUM(amount),0) AS recv FROM revenue_milestones WHERE project_id=$1 AND received=true`, [pid]);
      const revenueReceived = Number(milRes.rows[0].recv);

      const matRes = await pool.query(`SELECT COALESCE(SUM(qty_used*unit_cost),0) AS c FROM materials WHERE project_id=$1`, [pid]);
      const materialCost = Number(matRes.rows[0].c);

      const labRes = await pool.query(
        `SELECT COALESCE(SUM(wr.daily_rate),0) AS c FROM attendance a JOIN worker_rates wr ON wr.user_id=a.user_id AND wr.project_id=a.project_id WHERE a.project_id=$1 AND a.status='present'`, [pid]
      );
      const labourCost = Number(labRes.rows[0].c);

      const expRes = await pool.query(`SELECT COALESCE(SUM(amount),0) AS c FROM expenses WHERE project_id=$1`, [pid]);
      const expCost = Number(expRes.rows[0].c);

      const totalCost = materialCost + labourCost + expCost;
      const grossProfit = contractValue > 0 ? contractValue - totalCost : revenueReceived - totalCost;
      const revenue = contractValue > 0 ? contractValue : revenueReceived;
      const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      return {
        id: pid,
        title: p.title,
        status: p.status,
        contractValue,
        revenueReceived,
        totalCost,
        materialCost,
        labourCost,
        expCost,
        grossProfit,
        marginPct,
        marginAlert: contractValue > 0 && marginPct < alertThreshold,
        alertThreshold,
      };
    }));

    res.json(rows);
  } catch (e) {
    console.log(e.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ── P&L Settings (also before /:projectId) ────────────────────────────────

// PUT /api/pl/settings/:projectId
router.put("/settings/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const { contract_value, margin_alert_threshold } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO pl_settings (project_id, contract_value, margin_alert_threshold)
       VALUES ($1,$2,$3)
       ON CONFLICT (project_id) DO UPDATE
         SET contract_value=$2, margin_alert_threshold=$3, updated_at=NOW()
       RETURNING *`,
      [req.params.projectId, contract_value || 0, margin_alert_threshold || 15]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.log(e.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Revenue Milestones (before /:projectId) ────────────────────────────────

// POST /api/pl/revenue
router.post("/revenue", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const { project_id, title, amount, due_date, notes } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO revenue_milestones (project_id, title, amount, due_date, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [project_id, title, amount || 0, due_date || null, notes || null]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.log(e.message);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/pl/revenue/:id/toggle — mark received/unreceived
router.patch("/revenue/:id/toggle", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `UPDATE revenue_milestones
       SET received = NOT received,
           received_at = CASE WHEN NOT received THEN NOW() ELSE NULL END
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/pl/revenue/:id
router.delete("/revenue/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM revenue_milestones WHERE id=$1`, [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Worker Daily Rates (before /:projectId) ────────────────────────────────

// POST /api/pl/rates  — upsert daily rate for a worker on a project
router.post("/rates", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const { project_id, user_id, daily_rate } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO worker_rates (project_id, user_id, daily_rate)
       VALUES ($1,$2,$3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET daily_rate=$3
       RETURNING *`,
      [project_id, user_id, daily_rate || 0]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.log(e.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ── P&L for a single project ───────────────────────────────────────────────
// NOTE: This /:projectId wildcard MUST remain after all literal routes above

// GET /api/pl/:projectId  — full P&L breakdown
router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const pid = req.params.projectId;
  try {
    // 1. Contract value / settings
    const settingsRes = await pool.query(
      `SELECT * FROM pl_settings WHERE project_id = $1`, [pid]
    );
    const settings = settingsRes.rows[0] || { contract_value: 0, margin_alert_threshold: 15 };

    // 2. Revenue milestones
    const milRes = await pool.query(
      `SELECT * FROM revenue_milestones WHERE project_id = $1 ORDER BY due_date ASC NULLS LAST`, [pid]
    );
    const milestones = milRes.rows;
    const revenueReceived = milestones
      .filter(m => m.received)
      .reduce((s, m) => s + Number(m.amount), 0);
    const totalContractValue = Number(settings.contract_value) || 0;

    // 3. Material costs (qty_used × unit_cost)
    const matRes = await pool.query(
      `SELECT COALESCE(SUM(qty_used * unit_cost), 0) AS material_cost
       FROM materials WHERE project_id = $1`, [pid]
    );
    const materialCost = Number(matRes.rows[0].material_cost);

    // 4. Labour costs (attendance days × daily_rate)
    const labourRes = await pool.query(
      `SELECT
         COALESCE(SUM(wr.daily_rate), 0) AS labour_cost,
         COUNT(a.id) AS days_worked
       FROM attendance a
       JOIN worker_rates wr ON wr.user_id = a.user_id AND wr.project_id = a.project_id
       WHERE a.project_id = $1 AND a.status = 'present'`, [pid]
    );
    const labourCost = Number(labourRes.rows[0].labour_cost);

    // 5. Other expenses (already tracked — excludes Subcontractor separate line)
    const expRes = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN category = 'Subcontractor' THEN amount ELSE 0 END), 0) AS sub_cost,
         COALESCE(SUM(CASE WHEN category != 'Subcontractor' THEN amount ELSE 0 END), 0) AS other_cost,
         COALESCE(SUM(amount), 0) AS total_expenses
       FROM expenses WHERE project_id = $1`, [pid]
    );
    const subCost   = Number(expRes.rows[0].sub_cost);
    const otherCost = Number(expRes.rows[0].other_cost);

    // 6. Worker rates list
    const ratesRes = await pool.query(
      `SELECT wr.*, u.name FROM worker_rates wr
       JOIN users u ON wr.user_id = u.id
       WHERE wr.project_id = $1 ORDER BY u.name`, [pid]
    );

    // 7. Monthly burn (last 6 months) for projection chart
    const burnRes = await pool.query(
      `SELECT
         TO_CHAR(date_trunc('month', date), 'Mon YY') AS month,
         SUM(amount) AS spent
       FROM expenses
       WHERE project_id = $1 AND date >= NOW() - INTERVAL '6 months'
       GROUP BY date_trunc('month', date)
       ORDER BY date_trunc('month', date)`, [pid]
    );
    const burnByMonth = burnRes.rows.map(r => ({
      month: r.month,
      spent: Number(r.spent)
    }));

    // 8. Revenue received by month (for margin-over-time chart)
    const revByMonthRes = await pool.query(
      `SELECT
         TO_CHAR(date_trunc('month', received_at), 'Mon YY') AS month,
         SUM(amount) AS received
       FROM revenue_milestones
       WHERE project_id = $1 AND received = true
       GROUP BY date_trunc('month', received_at)
       ORDER BY date_trunc('month', received_at)`, [pid]
    );

    // 9. Calculations
    const totalCost     = materialCost + labourCost + subCost + otherCost;
    const grossProfit   = revenueReceived - totalCost;
    const marginPct     = revenueReceived > 0 ? (grossProfit / revenueReceived) * 100 : 0;

    // Projected: if project not done, project final cost based on current burn rate
    // Use days elapsed / total days × contract value as projected revenue
    const projectedRevenue = totalContractValue;
    const projectedProfit  = projectedRevenue - totalCost;
    const projectedMargin  = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;

    const alertThreshold = Number(settings.margin_alert_threshold) || 15;
    const marginAlert    = projectedRevenue > 0 && projectedMargin < alertThreshold;

    res.json({
      settings: { ...settings, contract_value: totalContractValue },
      milestones,
      revenue: {
        contractValue:   totalContractValue,
        received:        revenueReceived,
        pending:         totalContractValue - revenueReceived,
      },
      costs: {
        materials:       materialCost,
        labour:          labourCost,
        subcontractor:   subCost,
        other:           otherCost,
        total:           totalCost,
      },
      profit: {
        gross:           grossProfit,
        marginPct:       marginPct,
        projectedProfit: projectedProfit,
        projectedMargin: projectedMargin,
        marginAlert,
        alertThreshold,
      },
      workerRates: ratesRes.rows,
      burnByMonth,
      revByMonth: revByMonthRes.rows.map(r => ({ month: r.month, received: Number(r.received) })),
    });
  } catch (e) {
    console.log(e.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

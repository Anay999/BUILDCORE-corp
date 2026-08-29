/**
 * syncRoutes.js — Cross-module data sync endpoints
 *
 * GET  /api/sync/project-costs/:projectId   → real cost breakdown
 * POST /api/sync/payroll-timelogs           → fill present_days from time logs
 * GET  /api/sync/dashboard                  → aggregated dashboard KPIs
 * POST /api/sync/po-received/:poId          → PO received → auto-create expense + restock inventory
 */
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

// ── GET /api/sync/project-costs/:projectId ────────────────────────────────────
// Returns real aggregated cost breakdown for a project:
//   materials_cost  — from materials table (cost_used)
//   expenses_total  — from expenses table
//   labor_cost      — from payroll_runs for team members assigned to this project
//   equipment_cost  — from equipment deployed to this project (placeholder)
//   invoice_revenue — from invoices for this project
//   profit_loss     — revenue - total_costs
router.get("/project-costs/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const pid = req.params.projectId;

    // 1. Materials cost (actual usage cost)
    const matR = await pool.query(`
      SELECT COALESCE(SUM(qty_used * unit_cost), 0) AS materials_cost,
             COALESCE(SUM(qty_ordered * unit_cost), 0) AS materials_budget
      FROM materials WHERE project_id=$1
    `, [pid]);

    // 2. Expenses total
    const expR = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS expenses_total FROM expenses WHERE project_id=$1
    `, [pid]);

    // 3. Labor cost — payroll for assigned users (latest completed payroll run)
    const laborR = await pool.query(`
      SELECT COALESCE(SUM(pr.net_pay), 0) AS labor_cost
      FROM payroll_runs pr
      WHERE pr.user_id IN (
        SELECT UNNEST(pu.user_ids)
        FROM (
          SELECT ARRAY_AGG(pu2.user_id) AS user_ids
          FROM project_users pu2
          WHERE pu2.project_id = $1
        ) pu
      )
      AND pr.status IN ('paid','draft')
      AND pr.year = EXTRACT(YEAR FROM NOW())
      AND pr.month = EXTRACT(MONTH FROM NOW())
    `, [pid]).catch(() => ({ rows: [{ labor_cost: 0 }] }));

    // Fallback: get labor cost by assigned_users JSON column if no project_users table
    const laborR2 = await pool.query(`
      SELECT COALESCE(SUM(pr.net_pay), 0) AS labor_cost
      FROM payroll_runs pr
      JOIN projects p ON p.id = $1
      WHERE pr.user_id::text = ANY(
        SELECT jsonb_array_elements(p.assigned_users)->>'id'
        FROM projects WHERE id = $1
      )
      AND pr.year = EXTRACT(YEAR FROM NOW())
    `, [pid]).catch(() => ({ rows: [{ labor_cost: 0 }] }));

    // Use whichever gives non-zero
    const laborCost = Math.max(
      parseFloat(laborR.rows[0]?.labor_cost || 0),
      parseFloat(laborR2.rows[0]?.labor_cost || 0)
    );

    // 4. Equipment cost — equipment deployed to project (daily_cost × days since assigned)
    const equipR = await pool.query(`
      SELECT COALESCE(SUM(
        COALESCE(e.daily_cost, 0) *
        GREATEST(1, DATE_PART('day', NOW() - COALESCE(e.assigned_date::timestamp, e.created_at)))
      ), 0) AS equipment_cost
      FROM equipment e
      WHERE e.project_id = $1 AND e.status = 'deployed'
    `, [pid]).catch(() => ({ rows: [{ equipment_cost: 0 }] }));

    // 4b. Subcontractor cost — active subcontractors on this project
    const subR = await pool.query(`
      SELECT COALESCE(SUM(
        COALESCE(s.contract_value, 0)
      ), 0) AS subcontractor_cost
      FROM subcontractors s
      WHERE s.project_id = $1
        AND s.status IN ('active','completed')
    `, [pid]).catch(() => ({ rows: [{ subcontractor_cost: 0 }] }));

    // 5. Invoice revenue (paid invoices)
    const invR = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS invoice_revenue
      FROM invoices WHERE project_id=$1 AND status='paid'
    `, [pid]).catch(() => ({ rows: [{ invoice_revenue: 0 }] }));

    // 6. Project budget
    const projR = await pool.query(`SELECT budget FROM projects WHERE id=$1`, [pid]);

    const materialsCost      = parseFloat(matR.rows[0]?.materials_cost || 0);
    const materialsBudget    = parseFloat(matR.rows[0]?.materials_budget || 0);
    const expensesTotal      = parseFloat(expR.rows[0]?.expenses_total || 0);
    const equipmentCost      = parseFloat(equipR.rows[0]?.equipment_cost || 0);
    const subcontractorCost  = parseFloat(subR.rows[0]?.subcontractor_cost || 0);
    const invoiceRevenue     = parseFloat(invR.rows[0]?.invoice_revenue || 0);
    const projectBudget      = parseFloat(projR.rows[0]?.budget || 0);

    const totalCost = materialsCost + expensesTotal + laborCost + equipmentCost + subcontractorCost;
    const profitLoss = invoiceRevenue - totalCost;
    const budgetUsedPct = projectBudget > 0 ? Math.round((totalCost / projectBudget) * 100) : 0;

    res.json({
      project_id:         pid,
      materials_cost:     materialsCost,
      materials_budget:   materialsBudget,
      expenses_total:     expensesTotal,
      labor_cost:         laborCost,
      equipment_cost:     equipmentCost,
      subcontractor_cost: subcontractorCost,
      total_cost:         totalCost,
      invoice_revenue:    invoiceRevenue,
      profit_loss:        profitLoss,
      project_budget:     projectBudget,
      budget_used_pct:    budgetUsedPct,
    });
  } catch (e) {
    console.log("sync/project-costs error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/sync/payroll-timelogs ──────────────────────────────────────────
// Auto-fills present_days in payroll_runs based on actual time logs
// Body: { month, year }
router.post("/payroll-timelogs", async (req, res) => {
  const user = getUser(req);
  if (!user || !["boss","manager"].includes(user.role)) return res.status(403).json({ message: "Forbidden" });
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ message: "month and year required" });

    // Count distinct days each user clocked in during this month
    const logsR = await pool.query(`
      SELECT user_id,
             COUNT(DISTINCT DATE(clock_in)) AS days_present,
             ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(clock_out, NOW()) - clock_in))/3600)::numeric, 2) AS hours_total
      FROM time_logs
      WHERE EXTRACT(MONTH FROM clock_in) = $1
        AND EXTRACT(YEAR  FROM clock_in) = $2
        AND clock_in IS NOT NULL
      GROUP BY user_id
    `, [month, year]);

    const updated = [];
    for (const row of logsR.rows) {
      const r = await pool.query(`
        UPDATE payroll_runs
        SET present_days = $1
        WHERE user_id = $2 AND month = $3 AND year = $4
        RETURNING id, user_id, present_days, net_pay
      `, [row.days_present, row.user_id, month, year]);
      if (r.rows[0]) {
        updated.push({ ...r.rows[0], hours_total: row.hours_total });
      }
    }

    res.json({
      success: true,
      synced_count: updated.length,
      records: updated,
      message: `Updated present_days for ${updated.length} payroll records from time logs`,
    });
  } catch (e) {
    console.log("sync/payroll-timelogs error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/sync/po-received/:poId — PO received → auto-expense + inventory ─
// When a PO is marked received:
//   1. Create an expense for the project
//   2. If vendor matches an inventory item supplier, restock it
router.post("/po-received/:poId", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { inventory_item_id, restock_qty } = req.body;

    // Get the PO
    const poR = await pool.query(`SELECT * FROM purchase_orders WHERE id=$1`, [req.params.poId]);
    if (!poR.rows[0]) return res.status(404).json({ message: "PO not found" });
    const po = poR.rows[0];

    const results = { expense_created: false, inventory_restocked: false };

    // 1. Mark PO as received
    await pool.query(`
      UPDATE purchase_orders SET status='received', received_date=CURRENT_DATE, updated_at=NOW()
      WHERE id=$1
    `, [req.params.poId]);

    // 2. Auto-create expense for the project
    if (po.project_id) {
      await pool.query(`
        INSERT INTO expenses (project_id, added_by, category, description, amount, date, vendor_name, source_po_id)
        VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7)
        ON CONFLICT DO NOTHING
      `, [po.project_id, user.id,
          po.category || "Materials",
          `PO ${po.po_number}: ${po.description}`,
          po.amount,
          po.vendor_name,
          po.id]);
      results.expense_created = true;
    }

    // 3. If inventory_item_id provided, restock it
    if (inventory_item_id && restock_qty > 0) {
      await pool.query(`
        UPDATE inventory_items SET qty_in_stock = qty_in_stock + $1, updated_at=NOW() WHERE id=$2
      `, [restock_qty, inventory_item_id]);
      await pool.query(`
        INSERT INTO inventory_transactions (inventory_item_id, type, qty, reference, note, done_by)
        VALUES ($1,'receive',$2,$3,$4,$5)
      `, [inventory_item_id, restock_qty, po.po_number, `Received from PO: ${po.description}`, user.name]);
      results.inventory_restocked = true;
    }

    res.json({ success: true, ...results, po_id: req.params.poId });
  } catch (e) {
    console.log("sync/po-received error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/sync/dashboard — company-wide aggregated KPIs ───────────────────
router.get("/dashboard", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const [projects, expenses, payroll, inventory, invoices] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status='ongoing') AS ongoing,
          COUNT(*) FILTER (WHERE status='completed') AS completed,
          COALESCE(SUM(budget), 0) AS total_budget
        FROM projects
      `),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`),
      pool.query(`
        SELECT
          COALESCE(SUM(net_pay), 0) AS total_paid,
          COALESCE(SUM(net_pay), 0) FILTER (WHERE status='paid') AS total_disbursed
        FROM payroll_runs
        WHERE year = EXTRACT(YEAR FROM NOW())
      `).catch(() => ({ rows: [{ total_paid: 0, total_disbursed: 0 }] })),
      pool.query(`
        SELECT
          COUNT(*) AS total_items,
          COALESCE(SUM(qty_in_stock * unit_cost), 0) AS inventory_value,
          COUNT(*) FILTER (WHERE qty_in_stock <= reorder_level) AS low_stock
        FROM inventory_items
      `).catch(() => ({ rows: [{ total_items: 0, inventory_value: 0, low_stock: 0 }] })),
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) FILTER (WHERE status='paid') AS revenue
        FROM invoices
      `).catch(() => ({ rows: [{ revenue: 0 }] })),
    ]);

    res.json({
      projects:       projects.rows[0],
      expenses_total: parseFloat(expenses.rows[0]?.total || 0),
      payroll:        payroll.rows[0],
      inventory:      inventory.rows[0],
      revenue:        parseFloat(invoices.rows[0]?.revenue || 0),
    });
  } catch (e) {
    console.log("sync/dashboard error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

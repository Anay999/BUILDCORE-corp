const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");

// Public — no auth needed (used by login page before sign-in)
router.get("/public", async (req, res) => {
  try {
    const [projects, members, issues, tasks] = await Promise.all([
      // Active projects (status = ongoing or in_progress)
      pool.query(`SELECT COUNT(*) FROM projects WHERE LOWER(status) IN ('ongoing','in_progress','active')`),

      // Total team members (non-client users)
      pool.query(`SELECT COUNT(*) FROM users WHERE LOWER(role) != 'client'`),

      // Open issues
      pool.query(`SELECT COUNT(*) FROM issues WHERE LOWER(status) = 'open'`),

      // Task completion rate this calendar month
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE completed = true)  AS done,
          COUNT(*)                                   AS total
        FROM project_tasks
        WHERE created_at >= date_trunc('month', NOW())
      `),
    ]);

    const done  = parseInt(tasks.rows[0].done  || 0);
    const total = parseInt(tasks.rows[0].total || 0);
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

    res.json({
      activeProjects : parseInt(projects.rows[0].count || 0),
      teamMembers    : parseInt(members.rows[0].count  || 0),
      openIssues     : parseInt(issues.rows[0].count   || 0),
      taskCompletion : pct,
    });
  } catch (err) {
    console.error("Stats error:", err.message);
    // Fall back to zeros so the frontend never crashes
    res.json({ activeProjects: 0, teamMembers: 0, openIssues: 0, taskCompletion: 0 });
  }
});

module.exports = router;

// GET /api/stats/dashboard-live — live KPIs for "Today at a Glance"
router.get("/dashboard-live", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const in30  = new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0];

    const [
      attendanceToday,
      overdueTasks,
      pendingPOs,
      lowStock,
      expiringContracts,
      overdueRFIs,
      pendingRequisitions,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM attendance WHERE DATE(created_at)=CURRENT_DATE AND status='present'`).catch(()=>({rows:[{count:0}]})),
      pool.query(`SELECT COUNT(*) FROM project_tasks WHERE completed=false AND due_date < CURRENT_DATE`).catch(()=>({rows:[{count:0}]})),
      pool.query(`SELECT COUNT(*) FROM purchase_orders WHERE status='pending'`).catch(()=>({rows:[{count:0}]})),
      pool.query(`SELECT COUNT(*) FROM inventory_items WHERE qty_in_stock <= low_stock_threshold`).catch(()=>({rows:[{count:0}]})),
      pool.query(`SELECT COUNT(*) FROM contracts WHERE status='active' AND end_date BETWEEN CURRENT_DATE AND $1::date`, [in30]).catch(()=>({rows:[{count:0}]})),
      pool.query(`SELECT COUNT(*) FROM rfis WHERE status NOT IN ('closed','resolved') AND due_date < CURRENT_DATE`).catch(()=>({rows:[{count:0}]})),
      pool.query(`SELECT COUNT(*) FROM material_requisitions WHERE status='pending'`).catch(()=>({rows:[{count:0}]})),
    ]);

    res.json({
      attendanceToday:      parseInt(attendanceToday.rows[0].count || 0),
      overdueTasks:         parseInt(overdueTasks.rows[0].count || 0),
      pendingPOs:           parseInt(pendingPOs.rows[0].count || 0),
      lowStock:             parseInt(lowStock.rows[0].count || 0),
      expiringContracts:    parseInt(expiringContracts.rows[0].count || 0),
      overdueRFIs:          parseInt(overdueRFIs.rows[0].count || 0),
      pendingRequisitions:  parseInt(pendingRequisitions.rows[0].count || 0),
    });
  } catch (err) {
    console.error("dashboard-live error:", err.message);
    res.json({ attendanceToday:0, overdueTasks:0, pendingPOs:0, lowStock:0, expiringContracts:0, overdueRFIs:0, pendingRequisitions:0 });
  }
});

// GET /api/stats/alerts — contract expiry + tender deadlines
router.get("/alerts", async (req, res) => {
  try {
    const in30 = new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const [expiringContracts, overdueContracts, overdueTenders] = await Promise.all([
      pool.query(`SELECT id, title, vendor_name, end_date FROM contracts WHERE status='active' AND end_date BETWEEN CURRENT_DATE AND $1::date ORDER BY end_date`, [in30]).catch(()=>({rows:[]})),
      pool.query(`SELECT id, title, vendor_name, end_date FROM contracts WHERE status='active' AND end_date < CURRENT_DATE ORDER BY end_date DESC LIMIT 10`).catch(()=>({rows:[]})),
      pool.query(`SELECT id, title, deadline FROM tenders WHERE status='open' AND deadline < CURRENT_DATE ORDER BY deadline DESC LIMIT 10`).catch(()=>({rows:[]})),
    ]);

    const alerts = [];
    expiringContracts.rows.forEach(c => {
      const daysLeft = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
      alerts.push({ type:"contract_expiring", severity: daysLeft <= 7 ? "critical":"warning", title:`Contract expiring in ${daysLeft} day${daysLeft!==1?"s":""}`, detail:`${c.title} — ${c.vendor_name||""}`, id:c.id, date:c.end_date });
    });
    overdueContracts.rows.forEach(c => {
      alerts.push({ type:"contract_overdue", severity:"critical", title:"Contract past end date", detail:`${c.title} — ${c.vendor_name||""}`, id:c.id, date:c.end_date });
    });
    overdueTenders.rows.forEach(td => {
      alerts.push({ type:"tender_overdue", severity:"warning", title:"Tender deadline passed", detail:`${td.title}`, id:td.id, date:td.deadline });
    });

    res.json(alerts);
  } catch (err) {
    console.error("stats/alerts error:", err.message);
    res.json([]);
  }
});

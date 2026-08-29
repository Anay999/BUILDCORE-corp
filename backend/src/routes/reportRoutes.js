const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Ensure project_progress table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS project_progress (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    percentage NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => console.error("project_progress table init:", e.message));

// GET /api/reports/html/:projectId
// Returns a print-ready HTML progress report page
router.get("/html/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // Fetch all data in parallel
    const [projR, progressR, tasksR, issuesR, expensesR, materialsR, milestonesR, safetyR, logsR, teamR, changeR] = await Promise.all([
      pool.query(`SELECT p.*, COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id=p.id),0)+COALESCE((SELECT SUM(qty_used*unit_cost) FROM materials WHERE project_id=p.id),0) AS spent FROM projects p WHERE p.id=$1`, [projectId]),
      pool.query(`SELECT * FROM project_progress WHERE project_id=$1 ORDER BY date DESC LIMIT 10`, [projectId]),
      pool.query(`SELECT * FROM project_tasks WHERE project_id=$1 ORDER BY created_at DESC`, [projectId]),
      pool.query(`SELECT * FROM issues WHERE project_id=$1 ORDER BY created_at DESC LIMIT 10`, [projectId]),
      pool.query(`SELECT * FROM expenses WHERE project_id=$1 ORDER BY date DESC LIMIT 10`, [projectId]),
      pool.query(`SELECT * FROM materials WHERE project_id=$1 ORDER BY created_at DESC LIMIT 10`, [projectId]),
      pool.query(`SELECT * FROM milestones WHERE project_id=$1 ORDER BY due_date ASC`, [projectId]),
      pool.query(`SELECT * FROM safety_inspections WHERE project_id=$1 ORDER BY date DESC LIMIT 5`, [projectId]),
      pool.query(`SELECT * FROM daily_logs WHERE project_id=$1 ORDER BY log_date DESC LIMIT 5`, [projectId]),
      pool.query(`SELECT u.name, u.role FROM users u JOIN project_assignments pa ON pa.user_id=u.id WHERE pa.project_id=$1`, [projectId]),
      pool.query(`SELECT * FROM change_orders WHERE project_id=$1 ORDER BY created_at DESC LIMIT 5`, [projectId]),
    ]);

    if (!projR.rows.length) return res.status(404).send("<h1>Project not found</h1>");
    const p = projR.rows[0];
    const progress = progressR.rows;
    const tasks = tasksR.rows;
    const issues = issuesR.rows;
    const expenses = expensesR.rows;
    const materials = materialsR.rows;
    const milestones = milestonesR.rows;
    const safety = safetyR.rows;
    const logs = logsR.rows;
    const team = teamR.rows;
    const changeOrders = changeR.rows;

    const budget = Number(p.budget) || 0;
    const spent = Number(p.spent) || 0;
    const pct = budget > 0 ? Math.min(100, (spent / budget * 100)).toFixed(1) : "0.0";
    const tasksDone = tasks.filter(t => t.completed || t.status === "done").length;
    const tasksPct = tasks.length > 0 ? ((tasksDone / tasks.length) * 100).toFixed(0) : 0;
    const openIssues = issues.filter(i => i.status !== "resolved" && i.status !== "closed").length;
    const milestonesDone = milestones.filter(m => m.completed).length;
    const latestProgress = progress[0]?.percentage || 0;

    const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const statusColor = { "Completed": "#10b981", "Deployed": "#3b82f6", "In Progress": "#f59e0b", "Delayed": "#ef4444", "Planned": "#6366f1" }[p.status] || "#64748b";
    const prioColor = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };

    const bar = (v, max, color="#3b82f6") => `
      <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;margin-top:4px">
        <div style="width:${Math.min(100,v/max*100)}%;height:100%;background:${color};border-radius:99px"></div>
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Project Report — ${p.title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff;line-height:1.5}
  .page{padding:40px 48px;max-width:900px;margin:auto}
  h1{font-size:26px;font-weight:800;color:#0f172a}
  h2{font-size:15px;font-weight:700;color:#0f172a;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
  .meta{font-size:12px;color:#64748b;margin-top:6px}
  .status-badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;color:#fff;background:${statusColor}}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:16px 0}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px}
  .kpi-val{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:2px}
  .kpi-lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}
  th{background:#f1f5f9;padding:7px 10px;text-align:left;font-weight:700;color:#475569;font-size:11px;text-transform:uppercase}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#334155}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700}
  .badge-g{background:#d1fae5;color:#065f46}
  .badge-r{background:#fee2e2;color:#991b1b}
  .badge-y{background:#fef3c7;color:#92400e}
  .badge-b{background:#dbeafe;color:#1e40af}
  .team-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
  .team-chip{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:5px 12px;font-size:12px}
  .section-empty{font-size:12px;color:#94a3b8;padding:10px 0}
  .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none}
  }
</style>
</head>
<body>
<div class="page">

  <!-- PRINT BUTTON (hidden on print) -->
  <div class="no-print" style="margin-bottom:20px;display:flex;gap:10px;align-items:center">
    <button onclick="window.print()" style="padding:9px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Print / Save as PDF</button>
    <span style="font-size:12px;color:#64748b">Use your browser's print dialog — select "Save as PDF" as destination</span>
  </div>

  <!-- HEADER -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px">
    <div>
      <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">BUILDCORE CONSTRUCTION PORTAL</div>
      <h1>${p.title}</h1>
      <p class="meta">
        ${p.location ? `📍 ${p.location}` : ""}
        ${p.client_name ? ` &nbsp;·&nbsp; Client: <strong>${p.client_name}</strong>` : ""}
        ${p.deadline ? ` &nbsp;·&nbsp; Deadline: ${fmtDate(p.deadline)}` : ""}
      </p>
      <div style="margin-top:10px"><span class="status-badge">${p.status}</span></div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:11px;color:#64748b">Report Generated</div>
      <div style="font-weight:700;color:#0f172a">${new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })}</div>
    </div>
  </div>

  <!-- KPI STRIP -->
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-lbl">Budget</div>
      <div class="kpi-val">${fmt(budget)}</div>
      <div style="font-size:11px;color:#64748b">Allocated</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">Spent</div>
      <div class="kpi-val" style="color:${spent/budget>0.9?"#ef4444":spent/budget>0.75?"#f59e0b":"#0f172a"}">${fmt(spent)}</div>
      <div style="font-size:11px;color:#64748b">${pct}% of budget</div>
      ${bar(spent, budget || 1, spent/budget>0.9?"#ef4444":spent/budget>0.75?"#f59e0b":"#3b82f6")}
    </div>
    <div class="kpi">
      <div class="kpi-lbl">Progress</div>
      <div class="kpi-val">${latestProgress}%</div>
      <div style="font-size:11px;color:#64748b">Site completion</div>
      ${bar(latestProgress, 100, "#10b981")}
    </div>
    <div class="kpi">
      <div class="kpi-lbl">Tasks</div>
      <div class="kpi-val">${tasksDone}/${tasks.length}</div>
      <div style="font-size:11px;color:#64748b">${tasksPct}% done</div>
      ${bar(tasksDone, tasks.length || 1, "#6366f1")}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0">
    <div class="kpi"><div class="kpi-lbl">Open Issues</div><div class="kpi-val" style="color:${openIssues>0?"#ef4444":"#10b981"}">${openIssues}</div></div>
    <div class="kpi"><div class="kpi-lbl">Milestones</div><div class="kpi-val">${milestonesDone}/${milestones.length}</div></div>
  </div>

  <!-- TEAM -->
  <h2>Project Team (${team.length})</h2>
  ${team.length ? `<div class="team-list">${team.map(m => `<div class="team-chip"><strong>${m.name}</strong><span style="color:#64748b;font-size:11px"> · ${m.role}</span></div>`).join("")}</div>` : `<p class="section-empty">No team members assigned.</p>`}

  <!-- MILESTONES -->
  <h2>Milestones</h2>
  ${milestones.length ? `<table>
    <tr><th>Milestone</th><th>Due Date</th><th>Status</th></tr>
    ${milestones.map(m => `<tr><td>${m.title}</td><td>${fmtDate(m.due_date)}</td><td><span class="badge ${m.completed?"badge-g":"badge-y"}">${m.completed?"Completed":"Pending"}</span></td></tr>`).join("")}
  </table>` : `<p class="section-empty">No milestones defined.</p>`}

  <!-- TASKS -->
  <h2>Tasks (${tasks.length})</h2>
  ${tasks.length ? `<table>
    <tr><th>Task</th><th>Assigned To</th><th>Priority</th><th>Status</th></tr>
    ${tasks.slice(0,20).map(tk => `<tr>
      <td>${tk.title}</td>
      <td>${tk.assigned_to_name || "—"}</td>
      <td><span style="color:${prioColor[tk.priority]||"#64748b"};font-weight:700;font-size:11px">${(tk.priority||"—").toUpperCase()}</span></td>
      <td><span class="badge ${tk.completed||tk.status==="done"?"badge-g":"badge-y"}">${tk.completed||tk.status==="done"?"Done":"Pending"}</span></td>
    </tr>`).join("")}
  </table>${tasks.length>20?`<p style="font-size:11px;color:#94a3b8;margin-top:6px">Showing 20 of ${tasks.length} tasks.</p>`:""}` : `<p class="section-empty">No tasks found.</p>`}

  <!-- ISSUES -->
  <h2>Issues (${issues.length})</h2>
  ${issues.length ? `<table>
    <tr><th>Issue</th><th>Priority</th><th>Status</th><th>Reported</th></tr>
    ${issues.map(iss => `<tr>
      <td>${iss.title}</td>
      <td><span style="color:${prioColor[iss.priority]||"#64748b"};font-weight:700;font-size:11px">${(iss.priority||"—").toUpperCase()}</span></td>
      <td><span class="badge ${iss.status==="resolved"||iss.status==="closed"?"badge-g":iss.status==="in_progress"?"badge-b":"badge-r"}">${iss.status||"Open"}</span></td>
      <td>${fmtDate(iss.created_at)}</td>
    </tr>`).join("")}
  </table>` : `<p class="section-empty">No issues recorded.</p>`}

  <!-- EXPENSES -->
  <h2>Recent Expenses</h2>
  ${expenses.length ? `<table>
    <tr><th>Description</th><th>Category</th><th>Amount</th><th>Date</th></tr>
    ${expenses.map(e => `<tr><td>${e.description||"—"}</td><td>${e.category||"—"}</td><td>${fmt(e.amount)}</td><td>${fmtDate(e.date)}</td></tr>`).join("")}
  </table>` : `<p class="section-empty">No expenses recorded.</p>`}

  <!-- CHANGE ORDERS -->
  ${changeOrders.length ? `<h2>Change Orders</h2>
  <table>
    <tr><th>Title</th><th>Cost Impact</th><th>Status</th><th>Date</th></tr>
    ${changeOrders.map(co => `<tr>
      <td>${co.title}</td>
      <td style="color:${Number(co.cost_impact)>0?"#ef4444":"#10b981"}">${Number(co.cost_impact)>0?"+":""}${fmt(co.cost_impact)}</td>
      <td><span class="badge ${co.status==="approved"?"badge-g":co.status==="rejected"?"badge-r":"badge-y"}">${co.status}</span></td>
      <td>${fmtDate(co.created_at)}</td>
    </tr>`).join("")}
  </table>` : ""}

  <!-- DAILY LOGS -->
  ${logs.length ? `<h2>Recent Daily Logs</h2>
  <table>
    <tr><th>Date</th><th>Workers</th><th>Weather</th><th>Notes</th></tr>
    ${logs.map(l => `<tr><td>${fmtDate(l.log_date)}</td><td>${l.workers_count||"—"}</td><td>${l.weather||"—"}</td><td>${(l.notes||"—").substring(0,80)}</td></tr>`).join("")}
  </table>` : ""}

  <!-- FOOTER -->
  <div class="footer">
    <span>BuildCore Construction Portal</span>
    <span>Project ID: ${p.id} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString("en-IN")}</span>
  </div>
</div>
<script>
  // Auto-print if ?print=1 in URL
  if (new URLSearchParams(location.search).get("print") === "1") {
    window.addEventListener("load", () => setTimeout(() => window.print(), 400));
  }
</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("Report error:", err.message);
    res.status(500).send(`<h1>Error generating report</h1><pre>${err.message}</pre>`);
  }
});

module.exports = router;

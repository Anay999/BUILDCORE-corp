import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Ic } from "../context.jsx";
import { api, fmt, fmtDate, statusBadge, prioColor } from "../api.js";

const TABS = ["Overview", "Tasks", "Issues", "Team", "Finance"];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [team, setTeam] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks/${id}`).catch(() => []),
      api.get(`/issues/${id}`).catch(() => []),
      api.get(`/milestones/${id}`).catch(() => []),
    ]).then(([p, t, iss, ms]) => {
      setProject(p);
      setTasks(Array.isArray(t) ? t : []);
      setIssues(Array.isArray(iss) ? iss : []);
      setTeam(Array.isArray(p?.team_members) ? p.team_members : []);
      setMilestones(Array.isArray(ms) ? ms : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
        <h1>Loading…</h1>
      </div>
      <div className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b" }}>Loading project…</p>
      </div>
    </>
  );

  if (!project) return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
        <h1>Not Found</h1>
      </div>
      <div className="page-content"><div className="empty-state"><p>Project not found</p></div></div>
    </>
  );

  const pct = project.progress || 0;
  const budget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;
  const statusColor = { "In Progress": "#3b82f6", "Completed": "#10b981", "Delayed": "#ef4444", "Planned": "#8b5cf6", "On Hold": "#f59e0b" }[project.status] || "#64748b";
  const tasksDone = tasks.filter(t => t.completed || t.status === "done").length;
  const openIssues = issues.filter(i => i.status !== "resolved" && i.status !== "closed").length;

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
        <h1 style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.title}</h1>
        <button className="top-bar-action" style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}
          onClick={() => window.open(`/api/reports/html/${id}`, "_blank")}>
          <Ic.Download s={16} />
        </button>
      </div>

      <div className="page-content">
        {/* Header card */}
        <div className="card" style={{ borderLeft: `3px solid ${statusColor}`, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span className={`badge ${statusBadge(project.status)}`}>{project.status}</span>
            {project.deadline && <span style={{ fontSize: 12, color: "#64748b" }}>Due {fmtDate(project.deadline)}</span>}
          </div>
          {project.location && <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}><Ic.MapPin s={12} />{project.location}</div>}
          {project.description && <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>{project.description}</p>}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: statusColor }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: statusColor }}>{pct}%</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Site completion</div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi-card">
            <div className="kpi-val">{fmt(budget)}</div>
            <div className="kpi-lbl">Budget</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: spent / budget > 0.9 ? "#ef4444" : "#f1f5f9" }}>{fmt(spent)}</div>
            <div className="kpi-lbl">Spent ({budget > 0 ? ((spent / budget) * 100).toFixed(0) : 0}%)</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val">{tasksDone}/{tasks.length}</div>
            <div className="kpi-lbl">Tasks Done</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: openIssues > 0 ? "#ef4444" : "#10b981" }}>{openIssues}</div>
            <div className="kpi-lbl">Open Issues</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="chip-row" style={{ marginBottom: 14 }}>
          {TABS.map(t => <button key={t} className={`chip ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>

        {tab === "Overview" && <OverviewTab project={project} milestones={milestones} />}
        {tab === "Tasks" && <TasksTab tasks={tasks} />}
        {tab === "Issues" && <IssuesTab issues={issues} />}
        {tab === "Team" && <TeamTab team={team} />}
        {tab === "Finance" && <FinanceTab project={project} />}

        <div style={{ height: 8 }} />
      </div>
    </>
  );
}

function OverviewTab({ project, milestones }) {
  return (
    <>
      {project.client_name && (
        <div className="card card-sm" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Client</div>
          <div style={{ fontWeight: 700 }}>{project.client_name}</div>
          {project.client_email && <div style={{ fontSize: 13, color: "#94a3b8" }}>{project.client_email}</div>}
        </div>
      )}

      {milestones.length > 0 && (
        <>
          <div className="section-hdr"><h3>Milestones</h3></div>
          {milestones.map(m => (
            <div key={m.id} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, borderLeft: `3px solid ${m.completed ? "#10b981" : "#f59e0b"}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: m.completed ? "#052e16" : "#422006", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {m.completed ? <Ic.Check s={14} style={{ color: "#4ade80" }} /> : <Ic.Clock s={14} style={{ color: "#fbbf24" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(m.due_date)}</div>
              </div>
              <span className={`badge ${m.completed ? "badge-green" : "badge-yellow"}`}>{m.completed ? "Done" : "Pending"}</span>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function TasksTab({ tasks }) {
  const done = tasks.filter(t => t.completed || t.status === "done");
  const pending = tasks.filter(t => !t.completed && t.status !== "done");
  return (
    <>
      {tasks.length === 0 && <div className="empty-state"><Ic.List s={36} /><p>No tasks</p></div>}
      {pending.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {pending.map((t, i) => (
            <div key={t.id} className="list-item" style={{ padding: "12px 14px", borderBottom: i < pending.length - 1 ? "1px solid #334155" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: prioColor(t.priority), flexShrink: 0 }} />
              <div className="list-item-body">
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                {t.assigned_to_name && <div style={{ fontSize: 12, color: "#64748b" }}>{t.assigned_to_name}</div>}
              </div>
              <span className="badge badge-yellow" style={{ fontSize: 10 }}>Pending</span>
            </div>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: "#64748b", margin: "12px 0 6px", textTransform: "uppercase", letterSpacing: ".04em" }}>Completed ({done.length})</div>
          <div className="card" style={{ padding: 0 }}>
            {done.map((t, i) => (
              <div key={t.id} className="list-item" style={{ padding: "12px 14px", borderBottom: i < done.length - 1 ? "1px solid #334155" : "none", opacity: 0.6 }}>
                <Ic.Check s={14} style={{ color: "#10b981", flexShrink: 0 }} />
                <div className="list-item-body">
                  <div style={{ fontWeight: 600, fontSize: 14, textDecoration: "line-through" }}>{t.title}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function IssuesTab({ issues }) {
  return (
    <>
      {issues.length === 0 && <div className="empty-state"><Ic.AlertTriangle s={36} /><p>No issues</p></div>}
      {issues.map(iss => (
        <div key={iss.id} className="card card-sm" style={{ marginBottom: 8, borderLeft: `3px solid ${prioColor(iss.priority)}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontWeight: 700, fontSize: 14, flex: 1, marginRight: 8 }}>{iss.title}</div>
            <span className={`badge badge-${iss.status === "resolved" || iss.status === "closed" ? "green" : "red"}`}>{iss.status}</span>
          </div>
          {iss.description && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>{iss.description?.substring(0, 100)}</p>}
          <div style={{ fontSize: 11, marginTop: 6, textTransform: "uppercase", letterSpacing: ".04em", color: prioColor(iss.priority) }}>{iss.priority?.toUpperCase()} priority</div>
        </div>
      ))}
    </>
  );
}

function TeamTab({ team }) {
  const { initials } = { initials: (n = "") => n.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?" };
  return (
    <>
      {team.length === 0 && <div className="empty-state"><Ic.Users s={36} /><p>No team members</p></div>}
      {team.map((m, i) => (
        <div key={i} className="list-item" style={{ padding: "12px 0" }}>
          <div className="avatar">{m.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}</div>
          <div className="list-item-body">
            <div style={{ fontWeight: 700 }}>{m.name}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{m.role}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function FinanceTab({ project }) {
  const budget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;
  const remaining = budget - spent;
  const pct = budget > 0 ? ((spent / budget) * 100).toFixed(1) : 0;
  return (
    <div className="card">
      {[
        { label: "Budget", val: fmt(budget), color: "#3b82f6" },
        { label: "Spent", val: fmt(spent), color: pct > 90 ? "#ef4444" : pct > 75 ? "#f59e0b" : "#f1f5f9" },
        { label: "Remaining", val: fmt(remaining), color: remaining < 0 ? "#ef4444" : "#10b981" },
        { label: "Burn Rate", val: `${pct}%`, color: "#94a3b8" },
      ].map(r => (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #334155" }}>
          <span style={{ color: "#94a3b8", fontSize: 14 }}>{r.label}</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: r.color }}>{r.val}</span>
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Budget utilization</div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: pct > 90 ? "#ef4444" : pct > 75 ? "#f59e0b" : "#3b82f6" }} />
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, textAlign: "right" }}>{pct}% used</div>
      </div>
    </div>
  );
}

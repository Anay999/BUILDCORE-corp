import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Ic, useApp } from "../context.jsx";
import { api, fmt, fmtDate, statusBadge, prioColor } from "../api.js";

const TABS = ["Overview", "Tasks", "Issues", "Team", "Finance"];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { showToast, user } = useApp();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [team, setTeam] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", due_date: "" });
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: "", description: "", priority: "high", category: "Safety" });
  const [saving, setSaving] = useState(false);

  const loadProjectData = async () => {
    setLoading(true);
    let p = null;
    try {
      p = await api.get(`/projects/${id}`);
    } catch {
      try {
        const all = await api.get("/projects");
        if (Array.isArray(all)) {
          p = all.find((item) => String(item.id) === String(id));
        }
      } catch {}
    }

    if (p) {
      setProject(p);
      setTeam(Array.isArray(p.team_members || p.team || p.assigned_users) ? (p.team_members || p.team || p.assigned_users) : []);
    }

    const [t, iss, ms] = await Promise.all([
      api.get(`/tasks/${id}`).catch(() => []),
      api.get(`/issues/${id}`).catch(() => []),
      api.get(`/milestones/${id}`).catch(() => []),
    ]);

    setTasks(Array.isArray(t) ? t : []);
    setIssues(Array.isArray(iss) ? iss : []);
    setMilestones(Array.isArray(ms) ? ms : []);
    setLoading(false);
  };

  useEffect(() => {
    loadProjectData();
    const interval = setInterval(loadProjectData, 10000);
    window.addEventListener("focus", loadProjectData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", loadProjectData);
    };
  }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/tasks", { ...taskForm, project_id: Number(id) });
      showToast("Task created successfully! ✅", "success");
      setShowTaskModal(false);
      setTaskForm({ title: "", priority: "medium", due_date: "" });
      const updated = await api.get(`/tasks/${id}`).catch(() => []);
      setTasks(Array.isArray(updated) ? updated : []);
    } catch (err) {
      showToast(err.message || "Failed to create task", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}/toggle`);
      const updated = await api.get(`/tasks/${id}`).catch(() => []);
      setTasks(Array.isArray(updated) ? updated : []);
    } catch (err) {
      showToast(err.message || "Failed to update task", "error");
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/issues", { ...issueForm, project_id: Number(id) });
      showToast("Issue reported successfully! ⚠️", "success");
      setShowIssueModal(false);
      setIssueForm({ title: "", description: "", priority: "high", category: "Safety" });
      const updated = await api.get(`/issues/${id}`).catch(() => []);
      setIssues(Array.isArray(updated) ? updated : []);
    } catch (err) {
      showToast(err.message || "Failed to report issue", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !project) {
    return (
      <>
        <div className="top-bar">
          <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
          <h1>Loading Project…</h1>
        </div>
        <div className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <p style={{ color: "#64748b" }}>Fetching project details…</p>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <div className="top-bar">
          <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
          <h1>Project Details</h1>
        </div>
        <div className="page-content" style={{ textAlign: "center", padding: 40 }}>
          <div className="empty-state">
            <p>Could not load project info</p>
            <button onClick={loadProjectData} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
              Retry Loading
            </button>
          </div>
        </div>
      </>
    );
  }

  const pct = project.progress || (project.status?.toLowerCase() === "completed" ? 100 : project.status?.toLowerCase() === "ongoing" ? 55 : 10);
  const budget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;
  const statusColor = { "Ongoing": "#3b82f6", "In Progress": "#3b82f6", "Completed": "#10b981", "Delayed": "#ef4444", "Planned": "#8b5cf6", "On Hold": "#f59e0b" }[project.status] || "#3b82f6";
  const tasksDone = tasks.filter((t) => t.completed || t.status === "done").length;
  const openIssues = issues.filter((i) => i.status !== "resolved" && i.status !== "closed").length;

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
        <h1 style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.title}
        </h1>
        <button
          onClick={loadProjectData}
          style={{
            marginLeft: "auto",
            background: "#1e293b",
            color: "#38bdf8",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "5px 9px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🔄 Sync
        </button>
      </div>

      <div className="page-content">
        {/* Header Card */}
        <div className="card" style={{ borderLeft: `4px solid ${statusColor}`, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span className={`badge ${statusBadge(project.status)}`}>{project.status}</span>
            {project.deadline && <span style={{ fontSize: 12, color: "#64748b" }}>Due {fmtDate(project.deadline)}</span>}
          </div>
          {project.location && (
            <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
              <Ic.MapPin s={13} /> {project.location}
            </div>
          )}
          {project.blueprint && (
            <div style={{ fontSize: 12, color: "#38bdf8", display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
              <span>📐 Blueprint:</span> <span style={{ fontWeight: 600 }}>{project.blueprint}</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: statusColor }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: statusColor }}>{pct}%</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Site Construction Progress</div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi-card">
            <div className="kpi-val">{fmt(budget)}</div>
            <div className="kpi-lbl">Budget</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: spent / (budget || 1) > 0.9 ? "#ef4444" : "#f1f5f9" }}>{fmt(spent)}</div>
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
          {TABS.map((t) => (
            <button key={t} className={`chip ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <OverviewTab project={project} milestones={milestones} />}
        {tab === "Tasks" && <TasksTab tasks={tasks} onToggle={handleToggleTask} onAdd={() => setShowTaskModal(true)} />}
        {tab === "Issues" && <IssuesTab issues={issues} onAdd={() => setShowIssueModal(true)} />}
        {tab === "Team" && <TeamTab team={team} />}
        {tab === "Finance" && <FinanceTab project={project} />}

        <div style={{ height: 16 }} />
      </div>

      {/* CREATE TASK MODAL */}
      {showTaskModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Add Site Task</h2>
              <button onClick={() => setShowTaskModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="field">
                <label>Task Title *</label>
                <input type="text" placeholder="e.g. Pour foundation concrete slab" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="field">
                  <label>Due Date</label>
                  <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Add Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORT ISSUE MODAL */}
      {showIssueModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Report Site Issue</h2>
              <button onClick={() => setShowIssueModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateIssue}>
              <div className="field">
                <label>Issue Title *</label>
                <input type="text" placeholder="e.g. Scaffolding loose on 3rd floor" value={issueForm.title} onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Category</label>
                  <select value={issueForm.category} onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}>
                    <option value="Safety">Safety</option>
                    <option value="Structural">Structural</option>
                    <option value="MEP">MEP</option>
                    <option value="Quality">Quality</option>
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select value={issueForm.priority} onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows="3" placeholder="Describe the safety or quality defect..." value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#fff", padding: 8 }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Submit Issue"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function OverviewTab({ project, milestones }) {
  return (
    <>
      {project.client_name && (
        <div className="card card-sm" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Client Partner</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{project.client_name}</div>
        </div>
      )}

      {milestones.length > 0 ? (
        <>
          <div className="section-hdr" style={{ marginBottom: 8 }}><h3>Milestones</h3></div>
          {milestones.map((m) => (
            <div key={m.id} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, borderLeft: `3px solid ${m.completed ? "#10b981" : "#f59e0b"}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: m.completed ? "#052e16" : "#422006", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {m.completed ? <Ic.Check s={14} style={{ color: "#4ade80" }} /> : <Ic.Clock s={14} style={{ color: "#fbbf24" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{m.due_date ? fmtDate(m.due_date) : "No deadline"}</div>
              </div>
              <span className={`badge ${m.completed ? "badge-success" : "badge-warning"}`}>
                {m.completed ? "Done" : "Pending"}
              </span>
            </div>
          ))}
        </>
      ) : (
        <div className="card card-sm" style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
          Standard site milestones active
        </div>
      )}
    </>
  );
}

function TasksTab({ tasks, onToggle, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Site Tasks ({tasks.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11 }}>+ Add Task</button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <p>No tasks yet for this site</p>
        </div>
      ) : (
        tasks.map((t) => {
          const isDone = t.completed || t.status === "done";
          return (
            <div key={t.id} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, opacity: isDone ? 0.7 : 1 }}>
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => onToggle(t.id)}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#3b82f6" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#94a3b8" : "#f1f5f9" }}>
                  {t.title}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: 11, color: "#64748b" }}>
                  {t.assigned_to_name && <span>👤 {t.assigned_to_name}</span>}
                  {t.due_date && <span>📅 {fmtDate(t.due_date)}</span>}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: prioColor(t.priority || "medium"), textTransform: "uppercase" }}>
                {t.priority || "medium"}
              </span>
            </div>
          );
        })
      )}
    </>
  );
}

function IssuesTab({ issues, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Reported Issues ({issues.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11, background: "#ef4444" }}>+ Report Issue</button>
      </div>

      {issues.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <p>No safety or quality issues reported 🟢</p>
        </div>
      ) : (
        issues.map((i) => (
          <div key={i.id} className="card card-sm" style={{ borderLeft: `3px solid ${prioColor(i.priority || "high")}`, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{i.title}</div>
              <span className={`badge ${statusBadge(i.status)}`}>{i.status || "Open"}</span>
            </div>
            {i.description && <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 6px" }}>{i.description}</p>}
            <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#64748b" }}>
              <span>Category: {i.category || "Safety"}</span>
              <span>•</span>
              <span style={{ color: prioColor(i.priority || "high"), textTransform: "capitalize" }}>{i.priority} Priority</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function TeamTab({ team }) {
  return (
    <>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Assigned Workforce ({team.length})</h3>
      {team.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <p>No personnel assigned to this site</p>
        </div>
      ) : (
        team.map((m, idx) => (
          <div key={idx} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 13 }}>
              {m.name ? m.name.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "#38bdf8", textTransform: "capitalize" }}>{m.role || "Worker"}</div>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function FinanceTab({ project }) {
  const budget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;
  const remaining = budget - spent;

  return (
    <>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Project Financials</h3>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Total Allocated Budget:</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(budget)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Actual Expenses Logged:</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#38bdf8" }}>{fmt(spent)}</span>
        </div>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>Remaining Funds:</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: remaining >= 0 ? "#10b981" : "#ef4444" }}>
            {fmt(remaining)}
          </span>
        </div>
      </div>
    </>
  );
}

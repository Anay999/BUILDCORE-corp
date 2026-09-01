import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, fmtDate, prioColor, statusBadge } from "../api.js";

const FILTERS = ["All", "pending", "in_progress", "done"];
const LABEL = { pending: "Pending", in_progress: "In Progress", done: "Done" };

export default function TasksPage() {
  const { showToast } = useApp();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "medium", project_id: "", due_date: "", assigned_to: "" });

  function load() {
    Promise.all([
      api.get("/tasks").catch(() => []),
      api.get("/projects").catch(() => []),
    ]).then(([t, p]) => { setTasks(Array.isArray(t) ? t : []); setProjects(Array.isArray(p) ? p : []); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  const filtered = tasks.filter(t => {
    const mF = filter === "All" || (t.status || (t.completed ? "done" : "pending")) === filter;
    const mP = projectFilter === "All" || String(t.project_id) === projectFilter;
    return mF && mP;
  });

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post("/tasks", form);
      showToast("Task created", "success");
      setSheet(false);
      setForm({ title: "", priority: "medium", project_id: "", due_date: "", assigned_to: "" });
      load();
    } catch (err) { showToast(err.message, "error"); }
  }

  async function toggleDone(t) {
    try {
      await api.patch(`/tasks/${t.id}`, { completed: !t.completed });
      load();
    } catch (err) { showToast(err.message, "error"); }
  }

  return (
    <>
      <div className="top-bar">
        <h1>Tasks</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div className="chip-row">
          {FILTERS.map(f => <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f === "All" ? "All" : LABEL[f]}</button>)}
        </div>
        {projects.length > 0 && (
          <div className="chip-row">
            <button className={`chip ${projectFilter === "All" ? "active" : ""}`} onClick={() => setProjectFilter("All")}>All Projects</button>
            {projects.map(p => <button key={p.id} className={`chip ${projectFilter === String(p.id) ? "active" : ""}`} onClick={() => setProjectFilter(String(p.id))}>{p.title}</button>)}
          </div>
        )}

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          filtered.length === 0 ? <div className="empty-state"><Ic.List s={40} /><p>No tasks</p></div> :
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((t, i) => {
              const st = t.status || (t.completed ? "done" : "pending");
              return (
                <div key={t.id} className="list-item" style={{ padding: "14px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #334155" : "none" }}>
                  <button style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${t.completed || st === "done" ? "#10b981" : "#334155"}`, background: t.completed || st === "done" ? "#10b981" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    onClick={() => toggleDone(t)}>
                    {(t.completed || st === "done") && <Ic.Check s={12} style={{ color: "#fff" }} />}
                  </button>
                  <div className="list-item-body">
                    <div style={{ fontWeight: 600, fontSize: 14, textDecoration: t.completed ? "line-through" : "none", opacity: t.completed ? 0.5 : 1 }}>{t.title}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                      {t.priority && <span style={{ fontSize: 11, fontWeight: 700, color: prioColor(t.priority) }}>{t.priority.toUpperCase()}</span>}
                      {t.due_date && <span style={{ fontSize: 11, color: "#64748b" }}>{fmtDate(t.due_date)}</span>}
                    </div>
                  </div>
                  <span className={`badge badge-${st === "done" ? "green" : st === "in_progress" ? "blue" : "yellow"}`} style={{ fontSize: 10 }}>
                    {LABEL[st] || st}
                  </span>
                </div>
              );
            })}
          </div>
        }
        <div style={{ height: 8 }} />
      </div>

      {sheet && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>New Task</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X s={18} /></button>
            </div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div className="sheet-body">
                <div className="field"><label>Title *</label><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" /></div>
                <div className="field"><label>Project</label>
                  <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="field"><label>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                  </select>
                </div>
                <div className="field"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div className="sheet-footer">
                <button className="btn btn-primary btn-full" type="submit">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

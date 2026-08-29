import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../App.jsx";
import { api, fmtDate, prioColor, statusBadge } from "../api.js";

const FILTERS = ["All", "open", "in_progress", "resolved", "closed"];
const PRIOS = ["All", "critical", "high", "medium", "low"];

export default function IssuesPage() {
  const { showToast } = useApp();
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");
  const [prio, setPrio] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", project_id: "", reported_by: "" });

  function load() {
    Promise.all([api.get("/issues").catch(() => []), api.get("/projects").catch(() => [])])
      .then(([i, p]) => { setIssues(Array.isArray(i) ? i : []); setProjects(Array.isArray(p) ? p : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  const filtered = issues.filter(i => {
    const mF = filter === "All" || i.status === filter;
    const mP = prio === "All" || i.priority === prio;
    return mF && mP;
  });

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/issues", form); showToast("Issue reported", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  async function resolve(id) {
    try { await api.put(`/issues/${id}`, { status: "resolved" }); showToast("Marked resolved", "success"); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  return (
    <>
      <div className="top-bar">
        <h1>Issues</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div className="chip-row">
          {FILTERS.map(f => <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f === "All" ? "All" : f.replace("_", " ")}</button>)}
        </div>
        <div className="chip-row">
          {PRIOS.map(p => <button key={p} className={`chip ${prio === p ? "active" : ""}`} onClick={() => setPrio(p)} style={prio === p && p !== "All" ? {} : {}}>{p}</button>)}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          filtered.length === 0 ? <div className="empty-state"><Ic.AlertTriangle s={40} /><p>No issues found</p></div> :
          filtered.map(iss => (
            <div key={iss.id} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${prioColor(iss.priority)}` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{iss.title}</div>
                  {iss.description && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{iss.description?.substring(0, 120)}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: prioColor(iss.priority), textTransform: "uppercase" }}>{iss.priority}</span>
                    {iss.project_title && <span style={{ fontSize: 11, color: "#64748b" }}>{iss.project_title}</span>}
                    {iss.created_at && <span style={{ fontSize: 11, color: "#475569" }}>{fmtDate(iss.created_at)}</span>}
                  </div>
                </div>
                <span className={`badge ${statusBadge(iss.status)}`}>{iss.status}</span>
              </div>
              {iss.status !== "resolved" && iss.status !== "closed" && (
                <button className="btn btn-sm btn-success" style={{ marginTop: 10, width: "100%" }} onClick={() => resolve(iss.id)}>
                  <Ic.Check s={14} /> Mark Resolved
                </button>
              )}
            </div>
          ))
        }
        <div style={{ height: 8 }} />
      </div>

      {sheet && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header"><h2>Report Issue</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Title *</label><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Describe the issue" /></div>
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
                <div className="field"><label>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Provide details…" rows={3} /></div>
                <div className="field"><label>Reported By</label><input value={form.reported_by} onChange={e => setForm(f => ({ ...f, reported_by: e.target.value }))} placeholder="Your name" /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-danger btn-full" type="submit">Report Issue</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

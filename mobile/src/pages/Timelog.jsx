import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../App.jsx";
import { api, fmtDate } from "../api.js";

export default function TimelogPage() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ user_id: "", project_id: "", date: new Date().toISOString().slice(0, 10), hours: "", description: "", category: "Regular" });

  function load() {
    Promise.all([api.get("/time-tracking").catch(() => []), api.get("/projects").catch(() => []), api.get("/users").catch(() => [])])
      .then(([l, p, u]) => { setLogs(Array.isArray(l) ? l : []); setProjects(Array.isArray(p) ? p : []); setUsers(Array.isArray(u) ? u : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/time-tracking", form); showToast("Hours logged", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  const totalHrs = logs.reduce((s, l) => s + Number(l.hours || 0), 0);

  return (
    <>
      <div className="top-bar">
        <h1>Time Log</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi-card"><div className="kpi-val">{totalHrs.toFixed(1)}</div><div className="kpi-lbl">Total Hours</div></div>
          <div className="kpi-card"><div className="kpi-val">{logs.length}</div><div className="kpi-lbl">Entries</div></div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          logs.length === 0 ? <div className="empty-state"><Ic.Clock s={40} /><p>No time logged yet</p></div> :
          <div className="card" style={{ padding: 0 }}>
            {logs.map((l, i) => (
              <div key={l.id} className="list-item" style={{ padding: "12px 16px", borderBottom: i < logs.length - 1 ? "1px solid #334155" : "none" }}>
                <div className="list-item-icon" style={{ background: "#0c2a5e", color: "#60a5fa", fontSize: 14, fontWeight: 800, width: 44, height: 44, borderRadius: 12 }}>
                  {l.hours}h
                </div>
                <div className="list-item-body">
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{l.user_name || `User #${l.user_id}`}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{l.project_title || `Project #${l.project_id}`} · {fmtDate(l.date)}</div>
                  {l.description && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{l.description}</div>}
                </div>
                <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>{l.category || "Regular"}</span>
              </div>
            ))}
          </div>
        }
        <div style={{ height: 8 }} />
      </div>

      {sheet && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header"><h2>Log Hours</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Employee *</label>
                  <select required value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Project *</label>
                  <select required value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Date *</label><input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                  <div className="field"><label>Hours *</label><input type="number" min="0.5" max="24" step="0.5" required value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="8" /></div>
                </div>
                <div className="field"><label>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option>Regular</option><option>Overtime</option><option>Weekend</option><option>Holiday</option>
                  </select>
                </div>
                <div className="field"><label>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was done?" rows={2} /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Log Hours</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, fmtDate, ago } from "../api.js";

export default function DSRPage() {
  const { showToast } = useApp();
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ project_id: "", date: new Date().toISOString().slice(0, 10), weather: "Clear", workers_present: "", work_done: "", materials_used: "", equipment_used: "", issues: "", progress_pct: "", notes: "" });

  function load() {
    Promise.all([
      api.get("/dsr").catch(() => []),
      api.get("/projects").catch(() => []),
    ]).then(([r, p]) => { setReports(Array.isArray(r) ? r : []); setProjects(Array.isArray(p) ? p : []); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post("/dsr", form);
      showToast("DSR submitted", "success");
      setSheet(false);
      setForm({ project_id: "", date: new Date().toISOString().slice(0, 10), weather: "Clear", workers_present: "", work_done: "", materials_used: "", equipment_used: "", issues: "", progress_pct: "", notes: "" });
      load();
    } catch (err) { showToast(err.message, "error"); }
  }

  const WEATHER_OPTS = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain", "Storm", "Hot", "Humid"];

  return (
    <>
      <div className="top-bar">
        <h1>Daily Site Report</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div style={{ padding: "10px 14px", background: "#0c2a5e", border: "1px solid #1e40af", borderRadius: 12, marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <Ic.FileText s={16} style={{ color: "#60a5fa", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#93c5fd" }}>Tap <strong>+</strong> to submit today's site report from the field</p>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          reports.length === 0 ? (
            <div className="empty-state"><Ic.ClipboardList s={40} /><p>No DSRs submitted yet</p></div>
          ) : (
            reports.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{r.project_title || `Project #${r.project_id}`}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{fmtDate(r.date)} · {ago(r.created_at)}</div>
                  </div>
                  {r.progress_pct != null && (
                    <div style={{ background: "#1e293b", borderRadius: 10, padding: "4px 10px", fontSize: 13, fontWeight: 800, color: "#3b82f6" }}>{r.progress_pct}%</div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {r.weather && <div style={{ fontSize: 12, color: "#94a3b8" }}><span style={{ color: "#64748b" }}>Weather: </span>{r.weather}</div>}
                  {r.workers_present && <div style={{ fontSize: 12, color: "#94a3b8" }}><span style={{ color: "#64748b" }}>Workers: </span>{r.workers_present}</div>}
                </div>

                {r.work_done && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Work Done</div>
                    <div style={{ fontSize: 13, color: "#cbd5e1" }}>{r.work_done}</div>
                  </div>
                )}

                {r.issues && (
                  <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 10px", marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, marginBottom: 2 }}>ISSUES</div>
                    <div style={{ fontSize: 13, color: "#fca5a5" }}>{r.issues}</div>
                  </div>
                )}

                <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "100%" }}
                  onClick={() => window.open(`/api/reports/html/${r.project_id}`, "_blank")}>
                  <Ic.Download s={14} /> View Full Report
                </button>
              </div>
            ))
          )
        }
        <div style={{ height: 8 }} />
      </div>

      {sheet && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>New DSR</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X s={18} /></button>
            </div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Project *</label>
                  <select required value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">Select project…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Date *</label><input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                  <div className="field"><label>Workers</label><input type="number" min="0" placeholder="Count" value={form.workers_present} onChange={e => setForm(f => ({ ...f, workers_present: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Weather</label>
                  <select value={form.weather} onChange={e => setForm(f => ({ ...f, weather: e.target.value }))}>
                    {WEATHER_OPTS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="field"><label>Work Done Today *</label><textarea required value={form.work_done} onChange={e => setForm(f => ({ ...f, work_done: e.target.value }))} placeholder="Describe work completed today…" rows={3} /></div>
                <div className="field"><label>Materials Used</label><textarea value={form.materials_used} onChange={e => setForm(f => ({ ...f, materials_used: e.target.value }))} placeholder="List materials used…" rows={2} /></div>
                <div className="field"><label>Equipment Used</label><input value={form.equipment_used} onChange={e => setForm(f => ({ ...f, equipment_used: e.target.value }))} placeholder="Excavator, Crane, etc." /></div>
                <div className="field"><label>Progress % (site completion)</label><input type="number" min="0" max="100" placeholder="e.g. 45" value={form.progress_pct} onChange={e => setForm(f => ({ ...f, progress_pct: e.target.value }))} /></div>
                <div className="field"><label>Issues / Blockers</label><textarea value={form.issues} onChange={e => setForm(f => ({ ...f, issues: e.target.value }))} placeholder="Any problems on site?" rows={2} /></div>
                <div className="field"><label>Additional Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any other observations…" rows={2} /></div>
              </div>
              <div className="sheet-footer">
                <button className="btn btn-primary btn-full" type="submit">Submit DSR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

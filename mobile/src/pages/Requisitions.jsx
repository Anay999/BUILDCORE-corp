import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, fmtDate, statusBadge } from "../api.js";

export default function RequisitionsPage() {
  const { showToast } = useApp();
  const [reqs, setReqs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ item_name: "", quantity: "", unit: "Nos", project_id: "", priority: "medium", notes: "", required_by: "" });

  function load() {
    Promise.all([api.get("/requisitions").catch(() => []), api.get("/projects").catch(() => [])])
      .then(([r, p]) => { setReqs(Array.isArray(r) ? r : []); setProjects(Array.isArray(p) ? p : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/requisitions", form); showToast("Requisition submitted", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  const pending = reqs.filter(r => r.status === "pending");
  const approved = reqs.filter(r => r.status === "approved");

  return (
    <>
      <div className="top-bar">
        <h1>Requisitions</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi-card"><div className="kpi-val" style={{ color: "#f59e0b" }}>{pending.length}</div><div className="kpi-lbl">Pending</div></div>
          <div className="kpi-card"><div className="kpi-val" style={{ color: "#10b981" }}>{approved.length}</div><div className="kpi-lbl">Approved</div></div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          reqs.length === 0 ? <div className="empty-state"><Ic.Archive s={40} /><p>No requisitions yet</p></div> :
          reqs.map(r => (
            <div key={r.id} className="card card-sm" style={{ marginBottom: 10, borderLeft: `3px solid ${r.status === "approved" ? "#10b981" : r.status === "rejected" ? "#ef4444" : "#f59e0b"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.item_name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{r.quantity} {r.unit} · {r.project_title || `Project #${r.project_id}`}</div>
                  {r.required_by && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Needed by: {fmtDate(r.required_by)}</div>}
                </div>
                <span className={`badge ${statusBadge(r.status || "pending")}`}>{r.status || "pending"}</span>
              </div>
            </div>
          ))
        }
        <div style={{ height: 8 }} />
      </div>

      {sheet && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header"><h2>Material Requisition</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Item Name *</label><input required value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="e.g. Cement bags, Steel rods" /></div>
                <div className="field"><label>Project *</label>
                  <select required value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">Select project…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Quantity *</label><input type="number" required min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                  <div className="field"><label>Unit</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      {["Nos","Kg","Ton","L","m","m²","m³","Bag","Box"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="field"><label>Required By</label><input type="date" value={form.required_by} onChange={e => setForm(f => ({ ...f, required_by: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Submit Requisition</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../App.jsx";
import { api, fmt, fmtDate } from "../api.js";

export default function MaterialsPage() {
  const { showToast } = useApp();
  const [materials, setMaterials] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ name: "", project_id: "", qty_ordered: "", qty_used: "", unit: "Nos", unit_cost: "", supplier: "", delivery_date: "" });

  function load() {
    Promise.all([api.get("/materials").catch(() => []), api.get("/projects").catch(() => [])])
      .then(([m, p]) => { setMaterials(Array.isArray(m) ? m : []); setProjects(Array.isArray(p) ? p : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/materials", form); showToast("Material added", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  return (
    <>
      <div className="top-bar">
        <h1>Materials</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          materials.length === 0 ? <div className="empty-state"><Ic.Package s={40} /><p>No materials logged</p></div> :
          materials.map(m => {
            const cost = Number(m.qty_ordered || 0) * Number(m.unit_cost || 0);
            const pct = m.qty_ordered > 0 ? Math.min(100, (m.qty_used / m.qty_ordered) * 100) : 0;
            return (
              <div key={m.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.project_title || `Project #${m.project_id}`}</div>
                  </div>
                  {cost > 0 && <div style={{ fontWeight: 800, color: "#3b82f6", fontSize: 14 }}>{fmt(cost)}</div>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10, fontSize: 12 }}>
                  <div><div style={{ color: "#64748b" }}>Ordered</div><div style={{ fontWeight: 700 }}>{m.qty_ordered} {m.unit}</div></div>
                  <div><div style={{ color: "#64748b" }}>Used</div><div style={{ fontWeight: 700 }}>{m.qty_used || 0} {m.unit}</div></div>
                  <div><div style={{ color: "#64748b" }}>Unit Cost</div><div style={{ fontWeight: 700 }}>{fmt(m.unit_cost)}</div></div>
                </div>

                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct > 90 ? "#ef4444" : "#3b82f6" }} />
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{pct.toFixed(0)}% used</div>

                {m.supplier && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Supplier: {m.supplier}</div>}
                {m.delivery_date && <div style={{ fontSize: 12, color: "#94a3b8" }}>Delivery: {fmtDate(m.delivery_date)}</div>}
              </div>
            );
          })
        }
        <div style={{ height: 8 }} />
      </div>

      {sheet && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header"><h2>Add Material</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Material Name *</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cement, Steel bars" /></div>
                <div className="field"><label>Project *</label>
                  <select required value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Qty Ordered</label><input type="number" min="0" value={form.qty_ordered} onChange={e => setForm(f => ({ ...f, qty_ordered: e.target.value }))} /></div>
                  <div className="field"><label>Unit</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      {["Nos","Kg","Ton","L","m","m²","m³","Bag","Box","Roll","Set"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Qty Used</label><input type="number" min="0" value={form.qty_used} onChange={e => setForm(f => ({ ...f, qty_used: e.target.value }))} /></div>
                  <div className="field"><label>Unit Cost (₹)</label><input type="number" min="0" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Supplier</label><input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" /></div>
                <div className="field"><label>Delivery Date</label><input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Add Material</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

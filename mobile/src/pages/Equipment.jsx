import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, fmtDate, statusBadge } from "../api.js";

export default function EquipmentPage() {
  const { showToast } = useApp();
  const [equipment, setEquipment] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", serial_number: "", status: "available", purchase_date: "", last_maintenance: "", next_maintenance: "", notes: "" });

  function load() {
    api.get("/equipment").then(d => { setEquipment(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const statusList = ["All", "available", "in_use", "maintenance", "retired"];
  const filtered = filter === "All" ? equipment : equipment.filter(e => e.status === filter);

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/equipment", form); showToast("Equipment added", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  const statusColor = { available: "#10b981", in_use: "#3b82f6", maintenance: "#f59e0b", retired: "#64748b" };

  return (
    <>
      <div className="top-bar">
        <h1>Equipment</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div className="chip-row">
          {statusList.map(s => <button key={s} className={`chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s === "All" ? "All" : s.replace("_", " ")}</button>)}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          filtered.length === 0 ? <div className="empty-state"><Ic.Tool s={40} /><p>No equipment found</p></div> :
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((eq, i) => (
              <div key={eq.id} className="list-item" style={{ padding: "14px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #334155" : "none" }}>
                <div className="list-item-icon" style={{ background: (statusColor[eq.status] || "#64748b") + "22", color: statusColor[eq.status] || "#64748b" }}>
                  <Ic.Tool s={18} />
                </div>
                <div className="list-item-body">
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{eq.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {eq.type && <span>{eq.type} · </span>}
                    {eq.serial_number && <span>S/N: {eq.serial_number}</span>}
                  </div>
                  {eq.next_maintenance && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 3 }}>
                      Next maintenance: {fmtDate(eq.next_maintenance)}
                    </div>
                  )}
                </div>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor[eq.status] || "#64748b", boxShadow: `0 0 6px ${statusColor[eq.status] || "#64748b"}` }} />
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
            <div className="sheet-header"><h2>Add Equipment</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Name *</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. JCB Excavator" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Type</label><input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="Heavy, Light…" /></div>
                  <div className="field"><label>Serial No.</label><input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="available">Available</option><option value="in_use">In Use</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Purchase Date</label><input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
                  <div className="field"><label>Next Maintenance</label><input type="date" value={form.next_maintenance} onChange={e => setForm(f => ({ ...f, next_maintenance: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Add Equipment</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

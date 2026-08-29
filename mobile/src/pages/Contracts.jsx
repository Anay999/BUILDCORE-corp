import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../App.jsx";
import { api, fmt, fmtDate, statusBadge } from "../api.js";

export default function ContractsPage() {
  const { showToast } = useApp();
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ title: "", vendor_id: "", value: "", start_date: "", end_date: "", status: "active", notes: "" });

  function load() {
    Promise.all([api.get("/contracts").catch(() => []), api.get("/vendors").catch(() => [])])
      .then(([c, v]) => { setContracts(Array.isArray(c) ? c : []); setVendors(Array.isArray(v) ? v : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/contracts", form); showToast("Contract created", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  return (
    <>
      <div className="top-bar">
        <h1>Contracts</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          contracts.length === 0 ? <div className="empty-state"><Ic.FileText s={40} /><p>No contracts yet</p></div> :
          contracts.map(c => {
            const paid = Number(c.paid_amount) || 0;
            const val = Number(c.value) || 0;
            const pct = val > 0 ? ((paid / val) * 100).toFixed(0) : 0;
            return (
              <div key={c.id} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${c.status === "active" ? "#10b981" : c.status === "expired" ? "#ef4444" : "#64748b"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1, marginRight: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.vendor_name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "#3b82f6" }}>{fmt(val)}</div>
                    <span className={`badge ${statusBadge(c.status)}`} style={{ marginTop: 4 }}>{c.status}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
                  {c.start_date && <div><span style={{ color: "#64748b" }}>From </span>{fmtDate(c.start_date)}</div>}
                  {c.end_date && <div><span style={{ color: "#64748b" }}>Until </span>{fmtDate(c.end_date)}</div>}
                </div>
                {val > 0 && (
                  <>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: "#10b981" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{fmt(paid)} paid ({pct}%)</div>
                  </>
                )}
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
            <div className="sheet-header"><h2>New Contract</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Title *</label><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="field"><label>Vendor *</label>
                  <select required value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}>
                    <option value="">Select vendor…</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Contract Value (₹)</label><input type="number" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Start Date</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div className="field"><label>End Date</label><input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Create Contract</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

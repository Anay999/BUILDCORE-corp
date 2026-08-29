import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../App.jsx";
import { api, fmt, fmtDate, statusBadge } from "../api.js";

const FILTERS = ["All", "pending", "approved", "rejected", "delivered"];

export default function POsPage() {
  const { showToast } = useApp();
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ title: "", vendor_id: "", project_id: "", amount: "", expected_delivery: "", notes: "" });

  function load() {
    Promise.all([api.get("/purchase-orders").catch(() => []), api.get("/vendors").catch(() => []), api.get("/projects").catch(() => [])])
      .then(([p, v, pr]) => { setPos(Array.isArray(p) ? p : []); setVendors(Array.isArray(v) ? v : []); setProjects(Array.isArray(pr) ? pr : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "All" ? pos : pos.filter(p => p.status === filter);

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/purchase-orders", form); showToast("PO created", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  async function approve(id) {
    try { await api.patch(`/purchase-orders/${id}/approve`, {}); showToast("PO approved", "success"); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  const statusColor = { approved: "#10b981", pending: "#f59e0b", rejected: "#ef4444", delivered: "#3b82f6" };

  return (
    <>
      <div className="top-bar">
        <h1>Purchase Orders</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div className="chip-row">
          {FILTERS.map(f => <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          filtered.length === 0 ? <div className="empty-state"><Ic.ShoppingCart s={40} /><p>No purchase orders</p></div> :
          filtered.map(po => (
            <div key={po.id} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${statusColor[po.status] || "#64748b"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{po.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>PO #{po.id} · {po.vendor_name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "#3b82f6" }}>{fmt(po.amount)}</div>
                  <span className={`badge ${statusBadge(po.status)}`} style={{ marginTop: 4 }}>{po.status}</span>
                </div>
              </div>
              {po.project_title && <div style={{ fontSize: 12, color: "#94a3b8" }}>Project: {po.project_title}</div>}
              {po.expected_delivery && <div style={{ fontSize: 12, color: "#94a3b8" }}>Expected: {fmtDate(po.expected_delivery)}</div>}
              {po.status === "pending" && (
                <button className="btn btn-success btn-sm btn-full" style={{ marginTop: 10 }} onClick={() => approve(po.id)}>
                  <Ic.Check s={14} /> Approve PO
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
            <div className="sheet-header"><h2>New Purchase Order</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Title *</label><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="PO title" /></div>
                <div className="field"><label>Vendor *</label>
                  <select required value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}>
                    <option value="">Select vendor…</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Project</label>
                  <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Amount (₹) *</label><input type="number" min="0" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                  <div className="field"><label>Delivery Date</label><input type="date" value={form.expected_delivery} onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Create PO</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

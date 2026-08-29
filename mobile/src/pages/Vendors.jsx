import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../App.jsx";
import { api, fmt, statusBadge } from "../api.js";

export default function VendorsPage() {
  const { showToast } = useApp();
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", contact_name: "", phone: "", email: "", address: "" });

  function load() {
    api.get("/vendors").then(d => { setVendors(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const filtered = vendors.filter(v => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.category?.toLowerCase().includes(search.toLowerCase()));

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/vendors", form); showToast("Vendor added", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  const CATS = ["", "Civil", "Electrical", "Plumbing", "Steel", "Concrete", "Timber", "Paint", "Glass", "HVAC", "IT", "Furniture", "Other"];

  return (
    <>
      <div className="top-bar">
        <h1>Vendors</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}><Ic.Search s={16} /></span>
          <input style={{ width: "100%", background: "#1e293b", border: "1.5px solid #334155", borderRadius: 10, padding: "10px 12px 10px 38px", color: "#f1f5f9", fontSize: 15, outline: "none" }}
            placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          filtered.length === 0 ? <div className="empty-state"><Ic.Truck s={40} /><p>No vendors found</p></div> :
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((v, i) => (
              <div key={v.id} className="list-item" style={{ padding: "14px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #334155" : "none" }}>
                <div className="list-item-icon" style={{ background: "#1a2744", color: "#60a5fa" }}>
                  <Ic.Truck s={18} />
                </div>
                <div className="list-item-body">
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {v.category && <span style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "1px 6px", marginRight: 6 }}>{v.category}</span>}
                    {v.contact_name}
                  </div>
                  {v.phone && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{v.phone}</div>}
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "#64748b" }}>
                  {v.total_pos > 0 && <div style={{ fontWeight: 700, color: "#f1f5f9" }}>{v.total_pos} POs</div>}
                  {v.avg_score > 0 && <div style={{ color: "#f59e0b" }}>★ {Number(v.avg_score).toFixed(1)}</div>}
                </div>
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
            <div className="sheet-header"><h2>Add Vendor</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Vendor Name *</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Company name" /></div>
                <div className="field"><label>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATS.map(c => <option key={c} value={c}>{c || "Select category…"}</option>)}
                  </select>
                </div>
                <div className="field"><label>Contact Person</label><input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Address</label><textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Add Vendor</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

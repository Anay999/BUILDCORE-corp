import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, fmt, fmtDate, statusBadge } from "../api.js";

export default function TendersPage() {
  const { showToast } = useApp();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", budget: "", deadline: "", status: "open" });

  function load() {
    api.get("/tenders").then(d => { setTenders(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/tenders", form); showToast("Tender created", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  return (
    <>
      <div className="top-bar">
        <h1>Tenders</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          tenders.length === 0 ? <div className="empty-state"><Ic.FileText s={40} /><p>No tenders yet</p></div> :
          tenders.map(t => (
            <div key={t.id} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${t.status === "open" ? "#10b981" : t.status === "closed" ? "#64748b" : "#f59e0b"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1, marginRight: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{t.title}</div>
                  {t.description && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{t.description?.substring(0, 100)}</p>}
                </div>
                <span className={`badge ${statusBadge(t.status)}`}>{t.status}</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                {t.budget > 0 && <div><span style={{ color: "#64748b" }}>Budget </span><span style={{ fontWeight: 700, color: "#3b82f6" }}>{fmt(t.budget)}</span></div>}
                {t.deadline && <div><span style={{ color: "#64748b" }}>Deadline </span>{fmtDate(t.deadline)}</div>}
                {t.bids_count > 0 && <div><span style={{ color: "#64748b" }}>Bids </span>{t.bids_count}</div>}
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
            <div className="sheet-header"><h2>New Tender</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Title *</label><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Tender title" /></div>
                <div className="field"><label>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Budget (₹)</label><input type="number" min="0" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
                  <div className="field"><label>Deadline</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="open">Open</option><option value="closed">Closed</option><option value="awarded">Awarded</option>
                  </select>
                </div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Create Tender</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

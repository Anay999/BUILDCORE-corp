import React, { useState, useEffect } from "react";
import { Ic } from "../context.jsx";
import { api, fmt, fmtDate, statusBadge } from "../api.js";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api.get("/payroll").then(d => { setPayrolls(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const months = [...new Set(payrolls.map(p => p.pay_period || ""))].filter(Boolean);
  const filtered = filter === "All" ? payrolls : payrolls.filter(p => p.pay_period === filter);

  const totalNet = filtered.reduce((s, p) => s + Number(p.net_salary || 0), 0);
  const totalGross = filtered.reduce((s, p) => s + Number(p.gross_salary || 0), 0);

  return (
    <>
      <div className="top-bar">
        <h1>Payroll</h1>
      </div>

      <div className="page-content">
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi-card"><div className="kpi-val">{fmt(totalGross)}</div><div className="kpi-lbl">Gross</div></div>
          <div className="kpi-card"><div className="kpi-val">{fmt(totalNet)}</div><div className="kpi-lbl">Net Pay</div></div>
        </div>

        {months.length > 0 && (
          <div className="chip-row">
            <button className={`chip ${filter === "All" ? "active" : ""}`} onClick={() => setFilter("All")}>All</button>
            {months.map(m => <button key={m} className={`chip ${filter === m ? "active" : ""}`} onClick={() => setFilter(m)}>{m}</button>)}
          </div>
        )}

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          filtered.length === 0 ? <div className="empty-state"><Ic.DollarSign s={40} /><p>No payroll records</p></div> :
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((p, i) => (
              <div key={p.id} className="list-item" style={{ padding: "14px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #334155" : "none" }}>
                <div className="avatar" style={{ fontSize: 13 }}>{(p.employee_name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}</div>
                <div className="list-item-body">
                  <div style={{ fontWeight: 700 }}>{p.employee_name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {p.pay_period && <span>{p.pay_period} · </span>}
                    <span style={{ color: "#94a3b8" }}>Gross: {fmt(p.gross_salary)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "#10b981" }}>{fmt(p.net_salary)}</div>
                  <span className={`badge ${statusBadge(p.status || "pending")}`} style={{ fontSize: 10, marginTop: 4 }}>{p.status || "pending"}</span>
                </div>
              </div>
            ))}
          </div>
        }
        <div style={{ height: 8 }} />
      </div>
    </>
  );
}

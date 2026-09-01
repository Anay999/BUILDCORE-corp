import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ic } from "../context.jsx";
import { api, ago } from "../api.js";

export default function AlertsPage() {
  const nav = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api.get("/stats/alerts").then(d => { setAlerts(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const types = ["All", "contract_expiring", "contract_overdue", "tender_overdue", "task_overdue", "low_stock", "maintenance_due"];
  const filtered = filter === "All" ? alerts : alerts.filter(a => a.type === filter);

  const LABELS = { contract_expiring: "Contract Expiring", contract_overdue: "Contract Overdue", tender_overdue: "Tender Overdue", task_overdue: "Task Overdue", low_stock: "Low Stock", maintenance_due: "Maintenance Due" };
  const SEV_COLOR = { critical: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };

  const critical = alerts.filter(a => a.severity === "critical").length;
  const warning = alerts.filter(a => a.severity === "warning").length;

  return (
    <>
      <div className="top-bar">
        <h1>Alerts</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {critical > 0 && <span style={{ background: "#ef444422", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{critical} Critical</span>}
          {warning > 0 && <span style={{ background: "#f59e0b22", border: "1px solid #f59e0b", color: "#f59e0b", borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{warning} Warning</span>}
        </div>
      </div>

      <div className="page-content">
        <div className="chip-row">
          <button className={`chip ${filter === "All" ? "active" : ""}`} onClick={() => setFilter("All")}>All</button>
          {types.slice(1).filter(t => alerts.some(a => a.type === t)).map(t => (
            <button key={t} className={`chip ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>{LABELS[t] || t}</button>
          ))}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          filtered.length === 0 ? (
            <div className="empty-state">
              <Ic.Bell s={40} />
              <p>No alerts</p>
              <p style={{ fontSize: 13, color: "#475569" }}>All systems are looking good</p>
            </div>
          ) : (
            filtered.map((a, i) => {
              const color = SEV_COLOR[a.severity] || "#64748b";
              return (
                <div key={i} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "22", color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Ic.AlertTriangle s={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{a.message || a.title}</div>
                          {a.entity_name && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{a.entity_name}</div>}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color, background: color + "22", border: `1px solid ${color}`, borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
                          {a.severity?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#475569" }}>{LABELS[a.type] || a.type}</span>
                        {a.created_at && <span style={{ fontSize: 11, color: "#475569" }}>{ago(a.created_at)}</span>}
                      </div>
                    </div>
                  </div>
                  {(a.type?.includes("contract") || a.type?.includes("vendor")) && (
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => nav("/vendors")}>
                      View Vendor
                    </button>
                  )}
                </div>
              );
            })
          )
        }
        <div style={{ height: 8 }} />
      </div>
    </>
  );
}

import React, { useState } from "react";
import { useApp, Ic } from "../context.jsx";
import { fmt } from "../api.js";

export default function ReportsPage() {
  const { showToast } = useApp();
  const [downloading, setDownloading] = useState("");

  const handleExport = (reportName) => {
    setDownloading(reportName);
    setTimeout(() => {
      showToast(`${reportName} generated & exported! 📊`, "success");
      setDownloading("");
    }, 1200);
  };

  const reportsList = [
    {
      title: "Daily Site Report (DSR) Summary",
      desc: "Consolidated logs of weather, labor headcounts, and progress across all sites.",
      format: "PDF & Excel",
      color: "#3b82f6",
    },
    {
      title: "Project Financial & Cost Variance",
      desc: "Allocated budget vs. actual expenses, material costs, and remaining balance.",
      format: "CSV / Financial PDF",
      color: "#10b981",
    },
    {
      title: "Workforce Attendance & Timecard Register",
      desc: "GPS clock-in timestamps, 500m geofence compliance, and overtime hours.",
      format: "PDF & CSV",
      color: "#8b5cf6",
    },
    {
      title: "Safety & Quality Defect Audit",
      desc: "Open defects, severity index, resolution timeframes, and site hazard records.",
      format: "Safety PDF",
      color: "#ef4444",
    },
    {
      title: "Materials & Inventory Consumption",
      desc: "Cement, steel, aggregate usage rates, warehouse reorder alerts, and PO logs.",
      format: "Stock Sheet",
      color: "#f59e0b",
    },
  ];

  return (
    <>
      <div className="top-bar">
        <h1>Reports & Analytics</h1>
      </div>

      <div className="page-content">
        {/* Header KPI Summary */}
        <div className="card" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", border: "1px solid #334155", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
            Executive Operations Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>94.2%</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>On-Time Schedule Rate</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8" }}>87.5%</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Budget Efficiency</div>
            </div>
          </div>
        </div>

        <div className="section-hdr" style={{ marginBottom: 10 }}>
          <h3>Generate Operational Reports</h3>
        </div>

        {reportsList.map((r, i) => (
          <div
            key={i}
            className="card"
            style={{
              marginBottom: 10,
              borderLeft: `3px solid ${r.color}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{r.title}</div>
              <span className="badge badge-secondary" style={{ fontSize: 11 }}>{r.format}</span>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{r.desc}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={() => handleExport(r.title)}
                disabled={downloading === r.title}
                className="btn btn-primary btn-sm"
                style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
              >
                <Ic.Download s={14} />
                {downloading === r.title ? "Generating…" : "Export Report"}
              </button>
            </div>
          </div>
        ))}

        <div style={{ height: 16 }} />
      </div>
    </>
  );
}

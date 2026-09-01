import React from "react";
import { useNavigate } from "react-router-dom";
import { Ic } from "../context.jsx";

const MENU = [
  {
    group: "Field Operations",
    items: [
      { label: "Live GPS Tracker", path: "/gps", icon: <Ic.MapPin s={20} />, color: "#38bdf8" },
      { label: "Team Chat & DMs", path: "/chat", icon: <Ic.MessageSquare s={20} />, color: "#3b82f6" },
      { label: "Tasks", path: "/tasks", icon: <Ic.List s={20} />, color: "#3b82f6" },
      { label: "Issues", path: "/issues", icon: <Ic.AlertTriangle s={20} />, color: "#ef4444" },
      { label: "Attendance", path: "/attendance", icon: <Ic.Users s={20} />, color: "#10b981" },
      { label: "Alerts & Notifications", path: "/alerts", icon: <Ic.Bell s={20} />, color: "#f59e0b" },
      { label: "Time Log", path: "/timelog", icon: <Ic.Clock s={20} />, color: "#8b5cf6" },
    ],
  },
  {
    group: "Procurement",
    items: [
      { label: "Purchase Orders", path: "/pos", icon: <Ic.ShoppingCart s={20} />, color: "#f59e0b" },
      { label: "Requisitions", path: "/requisitions", icon: <Ic.Archive s={20} />, color: "#f97316" },
      { label: "Vendors", path: "/vendors", icon: <Ic.Truck s={20} />, color: "#06b6d4" },
      { label: "Tenders", path: "/tenders", icon: <Ic.FileText s={20} />, color: "#6366f1" },
      { label: "Contracts", path: "/contracts", icon: <Ic.FileText s={20} />, color: "#8b5cf6" },
    ],
  },
  {
    group: "Resources",
    items: [
      { label: "Materials", path: "/materials", icon: <Ic.Package s={20} />, color: "#84cc16" },
      { label: "Inventory", path: "/inventory", icon: <Ic.Layers s={20} />, color: "#14b8a6" },
      { label: "Equipment", path: "/equipment", icon: <Ic.Tool s={20} />, color: "#f43f5e" },
    ],
  },
  {
    group: "Finance & HR",
    items: [
      { label: "Payroll", path: "/payroll", icon: <Ic.DollarSign s={20} />, color: "#22c55e" },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Settings", path: "/settings", icon: <Ic.Settings s={20} />, color: "#64748b" },
    ],
  },
];

export default function MorePage() {
  const nav = useNavigate();

  return (
    <>
      <div className="top-bar">
        <h1>More</h1>
      </div>

      <div className="page-content">
        {MENU.map(section => (
          <div key={section.group} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
              {section.group}
            </div>
            <div className="card" style={{ padding: 0 }}>
              {section.items.map((item, i) => (
                <button key={item.path} onClick={() => nav(item.path)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", borderBottom: i < section.items.length - 1 ? "1px solid #334155" : "none", textAlign: "left" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: item.color + "22", color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{item.label}</div>
                  <Ic.ChevronRight s={16} style={{ color: "#475569" }} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: 8 }} />
      </div>
    </>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, Ic } from "../App.jsx";
import { initials } from "../api.js";

export default function SettingsPage() {
  const { user, doLogout } = useApp();
  const nav = useNavigate();
  const [confirming, setConfirming] = useState(false);

  function handleLogout() {
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 3000); return; }
    doLogout();
    nav("/login", { replace: true });
  }

  const rows = [
    { icon: <Ic.User s={18} />, label: "Profile", sub: user?.email || "" },
    { icon: <Ic.Building s={18} />, label: "Company", sub: "BuildCore Construction" },
    { icon: <Ic.Bell s={18} />, label: "Notifications", sub: "Manage alert preferences" },
    { icon: <Ic.Zap s={18} />, label: "App Version", sub: "v1.0.0 — Mobile PWA" },
  ];

  return (
    <>
      <div className="top-bar">
        <h1>Settings</h1>
      </div>

      <div className="page-content">
        {/* Profile card */}
        <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>{initials(user?.name || "U")}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{user?.name || "User"}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: "#8b5cf6", marginTop: 3, fontWeight: 700 }}>{user?.role?.replace(/_/g, " ")?.toUpperCase()}</div>
          </div>
        </div>

        {/* Settings list */}
        <div className="card" style={{ padding: 0, marginBottom: 14 }}>
          {rows.map((r, i) => (
            <div key={i} className="list-item" style={{ padding: "14px 16px", borderBottom: i < rows.length - 1 ? "1px solid #334155" : "none" }}>
              <div className="list-item-icon">{r.icon}</div>
              <div className="list-item-body">
                <div style={{ fontWeight: 700 }}>{r.label}</div>
                {r.sub && <div style={{ fontSize: 12, color: "#64748b" }}>{r.sub}</div>}
              </div>
              <Ic.ChevronRight s={14} />
            </div>
          ))}
        </div>

        {/* Desktop link */}
        <div className="card card-sm" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <Ic.BarChart s={18} style={{ color: "#3b82f6", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Open Desktop Version</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Full dashboard at localhost:3000</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => window.open("http://localhost:3000", "_blank")}>Open</button>
        </div>

        {/* PWA install hint */}
        <div style={{ background: "#0c2a5e", border: "1px solid #1e40af", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#60a5fa", marginBottom: 4 }}>Install as App</div>
          <p style={{ fontSize: 13, color: "#93c5fd" }}>Tap your browser's share/menu button and select "Add to Home Screen" to install BuildCore as a native app on your phone.</p>
        </div>

        {/* Logout */}
        <button className="btn btn-full" style={{ background: confirming ? "#ef4444" : "#1e293b", border: `1px solid ${confirming ? "#ef4444" : "#334155"}`, color: confirming ? "#fff" : "#ef4444" }} onClick={handleLogout}>
          <Ic.LogOut s={18} />
          {confirming ? "Tap again to confirm logout" : "Log Out"}
        </button>

        <div style={{ height: 24 }} />
      </div>
    </>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, Ic } from "../context.jsx";
import { initials, getApiBaseUrl, setApiBaseUrl } from "../api.js";

export default function SettingsPage() {
  const { user, doLogout, showToast } = useApp();
  const nav = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  function handleLogout() {
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 3000); return; }
    doLogout();
    nav("/login", { replace: true });
  }

  function handleSaveServer() {
    setApiBaseUrl(serverUrl);
    if (showToast) showToast("API Server URL updated!", "success");
    setShowServerConfig(false);
  }

  const rows = [
    { icon: <Ic.User s={18} />, label: "Profile", sub: user?.email || "" },
    { icon: <Ic.Building s={18} />, label: "Company", sub: "BuildCore Construction" },
    { icon: <Ic.Bell s={18} />, label: "Notifications", sub: "Manage alert preferences" },
    { icon: <Ic.Zap s={18} />, label: "App Version", sub: "v1.0.0 — Native APK / PWA" },
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

        {/* Server Connection Config */}
        <div className="card" style={{ marginBottom: 14, background: "#1e293b", border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowServerConfig(!showServerConfig)}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Ic.Zap s={18} style={{ color: "#38bdf8" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Backend API Connection</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{getApiBaseUrl()}</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: 11 }}>
              {showServerConfig ? "Close" : "Configure"}
            </button>
          </div>

          {showServerConfig && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #334155" }}>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Server API Base URL:</label>
              <input
                type="text"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="http://192.168.1.71:5000/api"
                style={{ width: "100%", padding: "8px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 8, color: "#fff", fontSize: 13, marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveServer} style={{ flex: 1 }}>Save URL</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setServerUrl("http://192.168.1.71:5000/api"); setApiBaseUrl("http://192.168.1.71:5000/api"); showToast("Reset to default Wi-Fi IP", "info"); setShowServerConfig(false); }}>Reset</button>
              </div>
            </div>
          )}
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

        {/* PWA / APK install hint */}
        <div style={{ background: "#0c2a5e", border: "1px solid #1e40af", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#60a5fa", marginBottom: 4 }}>Native App & PWA Mode</div>
          <p style={{ fontSize: 13, color: "#93c5fd" }}>Install this app on your phone as a standalone APK or add it to your Home Screen from the browser for offline access and full-screen field operations.</p>
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

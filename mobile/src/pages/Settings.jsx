import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, Ic } from "../context.jsx";
import { initials, getApiBaseUrl, setApiBaseUrl, api } from "../api.js";

export default function SettingsPage() {
  const { user, doLogout, showToast } = useApp();
  const nav = useNavigate();
  const [confirming, setConfirming] = useState(false);

  // Active Modals
  const [activeModal, setActiveModal] = useState(null); // "profile" | "company" | "notifications" | "version" | "server"

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "Anay",
    email: user?.email || "anaypolineni11@gmail.com",
    phone: user?.phone || "+91 98765 43210",
    role: user?.role || "boss",
  });

  // Company Form
  const [companyForm, setCompanyForm] = useState({
    name: "BuildCore Construction Pvt Ltd",
    gstin: "36AAACB1234F1Z5",
    address: "Plot 42, Hitech City, Hyderabad, Telangana",
    phone: "+91 40 2345 6789",
    sitesCount: "3 Active Projects",
  });

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    safetyAlerts: true,
    chatMessages: true,
    attendanceReminders: true,
    projectUpdates: true,
    soundVibration: true,
  });

  // Server URL
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [pingResult, setPingResult] = useState(null);
  const [pinging, setPinging] = useState(false);

  function handleLogout() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    doLogout();
    nav("/login", { replace: true });
  }

  function handleSaveProfile(e) {
    e.preventDefault();
    showToast("Profile changes saved! ✅", "success");
    setActiveModal(null);
  }

  function handleSaveCompany(e) {
    e.preventDefault();
    showToast("Company info updated! 🏢", "success");
    setActiveModal(null);
  }

  function handleSaveServer() {
    setApiBaseUrl(serverUrl);
    showToast("API Server URL updated!", "success");
    setActiveModal(null);
  }

  const handleTestPing = async () => {
    setPinging(true);
    setPingResult(null);
    const start = Date.now();
    try {
      await api.get("/stats/alerts");
      const ms = Date.now() - start;
      setPingResult(`Connected successfully (${ms}ms) ⚡`);
    } catch {
      setPingResult("Connection failed. Check server status.");
    } finally {
      setPinging(false);
    }
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    showToast("Local memory cache purged! 🧹", "success");
  };

  return (
    <>
      <div className="top-bar">
        <h1>Settings & Preferences</h1>
      </div>

      <div className="page-content">
        {/* Profile Card with Quick Edit */}
        <div
          className="card"
          onClick={() => setActiveModal("profile")}
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            marginBottom: 20,
            cursor: "pointer",
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
            {initials(user?.name || "U")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{user?.name || "User"}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: "#8b5cf6", marginTop: 3, fontWeight: 700 }}>
              {user?.role?.replace(/_/g, " ")?.toUpperCase() || "BOSS"}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: "5px 10px", fontSize: 11 }}
          >
            Edit
          </button>
        </div>

        {/* Interactive Settings Navigation Rows */}
        <div className="card" style={{ padding: 0, marginBottom: 14 }}>
          {/* 1. Profile */}
          <div
            className="list-item"
            onClick={() => setActiveModal("profile")}
            style={{ padding: "14px 16px", borderBottom: "1px solid #334155", cursor: "pointer" }}
          >
            <div className="list-item-icon"><Ic.User s={18} /></div>
            <div className="list-item-body">
              <div style={{ fontWeight: 700 }}>Profile</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{user?.email || "Personal info & credentials"}</div>
            </div>
            <Ic.ChevronRight s={14} />
          </div>

          {/* 2. Company */}
          <div
            className="list-item"
            onClick={() => setActiveModal("company")}
            style={{ padding: "14px 16px", borderBottom: "1px solid #334155", cursor: "pointer" }}
          >
            <div className="list-item-icon"><Ic.Building s={18} /></div>
            <div className="list-item-body">
              <div style={{ fontWeight: 700 }}>Company</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>BuildCore Construction Pvt Ltd</div>
            </div>
            <Ic.ChevronRight s={14} />
          </div>

          {/* 3. Notifications */}
          <div
            className="list-item"
            onClick={() => setActiveModal("notifications")}
            style={{ padding: "14px 16px", borderBottom: "1px solid #334155", cursor: "pointer" }}
          >
            <div className="list-item-icon"><Ic.Bell s={18} /></div>
            <div className="list-item-body">
              <div style={{ fontWeight: 700 }}>Notifications</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Manage alert preferences & sounds</div>
            </div>
            <Ic.ChevronRight s={14} />
          </div>

          {/* 4. App Version & Diagnostics */}
          <div
            className="list-item"
            onClick={() => setActiveModal("version")}
            style={{ padding: "14px 16px", cursor: "pointer" }}
          >
            <div className="list-item-icon"><Ic.Zap s={18} /></div>
            <div className="list-item-body">
              <div style={{ fontWeight: 700 }}>App Version & Diagnostics</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>v1.0.0 — Native APK & Diagnostics</div>
            </div>
            <Ic.ChevronRight s={14} />
          </div>
        </div>

        {/* Server Connection Config Row */}
        <div
          className="card"
          style={{ marginBottom: 14, background: "#1e293b", border: "1px solid #334155" }}
        >
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setActiveModal("server")}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Ic.Zap s={18} style={{ color: "#38bdf8" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Backend API Connection</div>
                <div style={{ fontSize: 12, color: "#94a3b8", maxWidth: 210, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getApiBaseUrl()}
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: 11 }}>
              Configure
            </button>
          </div>
        </div>

        {/* Desktop link */}
        <div className="card card-sm" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <Ic.BarChart s={18} style={{ color: "#3b82f6", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Open Desktop Version</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Full dashboard at localhost:3000</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => window.open("http://localhost:3000", "_blank")}>
            Open
          </button>
        </div>

        {/* PWA / APK install hint */}
        <div
          style={{
            background: "#0c2a5e",
            border: "1px solid #1e40af",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: "#60a5fa", marginBottom: 4 }}>
            Native App & PWA Mode
          </div>
          <p style={{ fontSize: 13, color: "#93c5fd" }}>
            BuildCore Enterprise APK is synchronized with your cloud database. All changes on phone immediately reflect on web and vice versa.
          </p>
        </div>

        {/* Logout */}
        <button
          className="btn btn-full"
          style={{
            background: confirming ? "#ef4444" : "#1e293b",
            border: `1px solid ${confirming ? "#ef4444" : "#334155"}`,
            color: confirming ? "#fff" : "#ef4444",
          }}
          onClick={handleLogout}
        >
          <Ic.LogOut s={18} />
          {confirming ? "Tap again to confirm logout" : "Log Out"}
        </button>

        <div style={{ height: 24 }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SETTINGS MODALS
          ═══════════════════════════════════════════════════════════════════════════ */}

      {/* 1. EDIT PROFILE MODAL */}
      {activeModal === "profile" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>My Profile</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleSaveProfile}>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 24, margin: "0 auto 8px" }}>
                  {initials(profileForm.name)}
                </div>
                <span style={{ fontSize: 12, color: "#38bdf8" }}>{profileForm.role.toUpperCase()}</span>
              </div>
              <div className="field">
                <label>Full Name</label>
                <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
              </div>
              <div className="field">
                <label>Phone Number</label>
                <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. COMPANY DETAILS MODAL */}
      {activeModal === "company" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Company Information</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleSaveCompany}>
              <div className="field">
                <label>Company Name</label>
                <input type="text" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>GSTIN / Tax ID</label>
                <input type="text" value={companyForm.gstin} onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })} />
              </div>
              <div className="field">
                <label>Headquarters Address</label>
                <input type="text" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
              </div>
              <div className="field">
                <label>Company Contact Phone</label>
                <input type="text" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)} style={{ flex: 1 }}>Close</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. NOTIFICATION PREFERENCES MODAL */}
      {activeModal === "notifications" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Alert Preferences</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "safetyAlerts", label: "🚨 Safety & Defect Alerts", desc: "Urgent hazards and critical reports" },
                { key: "chatMessages", label: "💬 Team Chat & DMs", desc: "Incoming direct messages and mentions" },
                { key: "attendanceReminders", label: "⏰ Auto Attendance Clock-in", desc: "500m geofence arrival notices" },
                { key: "projectUpdates", label: "📁 Project & Stage Changes", desc: "Task and milestone completions" },
                { key: "soundVibration", label: "🔊 In-App Audio & Haptics", desc: "Turn voice guidance and alert sounds" },
              ].map((item) => (
                <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #334155" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs[item.key]}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked })}
                    style={{ width: 20, height: 20, accentColor: "#3b82f6", cursor: "pointer" }}
                  />
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-full" onClick={() => { showToast("Preferences updated! 🔔", "success"); setActiveModal(null); }} style={{ marginTop: 16 }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* 4. APP VERSION & DIAGNOSTICS MODAL */}
      {activeModal === "version" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>System Diagnostics</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div className="card card-sm" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>App Version:</span>
                <span style={{ fontWeight: 700, fontSize: 12 }}>BuildCore v1.0.0 (Native)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Runtime:</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#38bdf8" }}>Capacitor Android</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Sync Engine:</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#10b981" }}>Active SWR + SSE</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleTestPing} disabled={pinging} style={{ width: "100%" }}>
                {pinging ? "Testing Latency…" : "⚡ Test Server Latency (Ping)"}
              </button>
              {pingResult && <div style={{ fontSize: 12, textAlign: "center", color: pingResult.includes("success") ? "#10b981" : "#ef4444" }}>{pingResult}</div>}
              <button className="btn btn-secondary btn-sm" onClick={handleClearCache} style={{ width: "100%" }}>
                🧹 Clear In-Memory Cache
              </button>
            </div>

            <button className="btn btn-primary btn-full" onClick={() => setActiveModal(null)} style={{ marginTop: 14 }}>
              Close Diagnostics
            </button>
          </div>
        </div>
      )}

      {/* 5. SERVER CONFIG MODAL */}
      {activeModal === "server" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>API Server Connection</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div className="field">
              <label>API Base URL</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://buildcore-anay-live.loca.lt/api"
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setServerUrl("https://buildcore-anay-live.loca.lt/api"); }} style={{ flex: 1 }}>Tunnel URL</button>
              <button className="btn btn-secondary" onClick={() => { setServerUrl("http://192.168.1.71:5000/api"); }} style={{ flex: 1 }}>Direct LAN</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveServer} style={{ flex: 2 }}>Save Connection</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context.jsx";
import { api, getApiBaseUrl, setApiBaseUrl, normalizeApiUrl } from "../api.js";

export default function LoginPage() {
  const { doLogin, showToast } = useApp();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "anaypolineni11@gmail.com", password: "" });
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [pingStatus, setPingStatus] = useState("checking");

  async function checkPing() {
    setPingStatus("checking");
    const current = getApiBaseUrl();
    const rootUrl = current.replace(/\/api\/?$/, "");

    try {
      const res = await fetch(rootUrl, {
        method: "GET",
        headers: { "Bypass-Tunnel-Reminder": "true" },
      });
      if (res.ok) {
        setPingStatus("online");
      } else {
        setPingStatus("offline");
      }
    } catch {
      setPingStatus("offline");
    }
  }

  useEffect(() => {
    checkPing();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.password) {
      showToast("Please enter your password", "error");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post("/auth/login", form);
      doLogin(data.token, data.user);
      showToast("Welcome back! 🚀", "success");
      nav("/", { replace: true });
    } catch (err) {
      showToast(err.message || "Login failed — check server connection", "error");
      checkPing();
    } finally {
      setLoading(false);
    }
  }

  function handleSaveServer() {
    const clean = normalizeApiUrl(serverUrl);
    setApiBaseUrl(clean);
    setServerUrl(clean);
    showToast("Server URL updated!", "info");
    setShowConfig(false);
    checkPing();
  }

  return (
    <div className="login-wrap" style={{ overflowY: "auto", maxHeight: "100vh" }}>
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
            <line x1="9" y1="13" x2="9.01" y2="13" />
            <line x1="15" y1="13" x2="15.01" y2="13" />
          </svg>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9" }}>BuildCore ERP</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Construction Operations Mobile</p>
      </div>

      <form onSubmit={submit} style={{ width: "100%", maxWidth: 360 }}>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            autoComplete="current-password"
          />
        </div>

        <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 10, padding: "14px", fontSize: 15, fontWeight: 700 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      {/* Clean Server Status Badge */}
      <div
        style={{
          marginTop: 22,
          width: "100%",
          maxWidth: 360,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: "12px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: pingStatus === "online" ? "#10b981" : pingStatus === "checking" ? "#f59e0b" : "#ef4444",
                boxShadow: pingStatus === "online" ? "0 0 10px #10b981" : "none",
              }}
            />
            <span style={{ fontSize: 12, color: pingStatus === "online" ? "#34d399" : pingStatus === "checking" ? "#fbbf24" : "#f87171", fontWeight: 700 }}>
              {pingStatus === "online" ? "Server Online 🟢" : pingStatus === "checking" ? "Checking server..." : "Server Offline 🔴"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={checkPing}
              style={{ background: "none", border: "none", color: "#34d399", fontSize: 12, cursor: "pointer", fontWeight: 700 }}
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              style={{ background: "none", border: "none", color: "#38bdf8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
            >
              {showConfig ? "Close" : "Server URL"}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, wordBreak: "break-all" }}>
          {getApiBaseUrl()}
        </div>

        {showConfig && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #334155" }}>
            <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Backend API URL:</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://192.168.1.71:5000/api"
              style={{ width: "100%", padding: "8px 10px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 12, marginBottom: 8 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setServerUrl("http://192.168.1.71:5000/api");
                  setApiBaseUrl("http://192.168.1.71:5000/api");
                  showToast("Switched to Direct Wi-Fi (192.168.1.71)", "info");
                  checkPing();
                }}
                style={{ padding: "5px 6px", fontSize: 10, fontWeight: 700 }}
              >
                📶 Direct Wi-Fi
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setServerUrl("https://stale-grasshopper-30.loca.lt/api");
                  setApiBaseUrl("https://stale-grasshopper-30.loca.lt/api");
                  showToast("Switched to Cloud Tunnel", "info");
                  checkPing();
                }}
                style={{ padding: "5px 6px", fontSize: 10, fontWeight: 700 }}
              >
                🌐 Cloud Tunnel
              </button>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveServer} style={{ flex: 1, padding: "6px 8px", fontSize: 11 }}>
                Save URL
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={checkPing} style={{ padding: "6px 8px", fontSize: 11 }}>
                Test Ping
              </button>
            </div>
          </div>
        )}
      </div>

      <p style={{ color: "#475569", fontSize: 11, marginTop: 22, textAlign: "center" }}>
        BuildCore ERP v1.0 · Mobile APK
      </p>
    </div>
  );
}

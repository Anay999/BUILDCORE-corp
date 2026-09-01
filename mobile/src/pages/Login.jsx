import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context.jsx";
import { api, getApiBaseUrl, setApiBaseUrl } from "../api.js";

const CANDIDATE_URLS = [
  "http://192.168.1.71:5000/api",   // Wi-Fi LAN IP
  "http://192.168.137.73:5000/api", // Mobile Hotspot IP
  "https://buildcore-anay-live.loca.lt/api", // Cloud Tunnel
  "http://10.0.2.2:5000/api",       // Android Emulator
];

export default function LoginPage() {
  const { doLogin, showToast } = useApp();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "anaypolineni11@gmail.com", password: "" });
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [pingStatus, setPingStatus] = useState("checking"); // "online", "offline", "checking"

  async function testUrl(targetUrl) {
    if (!targetUrl) return false;
    const rootUrl = targetUrl.replace(/\/api\/?$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    try {
      const res = await fetch(rootUrl, {
        method: "GET",
        headers: {
          "Bypass-Tunnel-Reminder": "true",
          "bypass-tunnel-reminder": "true",
          "ngrok-skip-browser-warning": "true",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        return text.includes("Construction AI Backend") || text.includes("api") || res.status === 200;
      }
      return false;
    } catch {
      clearTimeout(timer);
      return false;
    }
  }

  async function checkPing() {
    setPingStatus("checking");

    // Fast parallel probe across all candidates simultaneously
    const candidates = [
      getApiBaseUrl(),
      "http://192.168.1.71:5000/api",
      "http://192.168.137.73:5000/api",
      "https://buildcore-anay-live.loca.lt/api",
    ];

    const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

    try {
      // Find whichever server responds first!
      const fastest = await Promise.any(
        uniqueCandidates.map(async (url) => {
          const ok = await testUrl(url);
          if (ok) return url;
          throw new Error("unreachable");
        })
      );

      setApiBaseUrl(fastest);
      setServerUrl(fastest);
      setPingStatus("online");
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
      showToast("Signed in successfully! 🚀", "success");
      nav("/", { replace: true });
    } catch (err) {
      const msg = err.message || "Login failed";
      showToast(msg, "error");
      // If it was a network error, trigger re-scan
      if (msg.includes("reach") || msg.includes("network") || msg.includes("Failed to fetch")) {
        checkPing();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSaveServer(urlToSave) {
    const target = urlToSave || serverUrl;
    setApiBaseUrl(target);
    setServerUrl(target);
    showToast(`Server URL set to ${target}`, "info");
    setShowConfig(false);
    checkPing();
  }

  return (
    <div className="login-wrap" style={{ overflowY: "auto", maxHeight: "100vh" }}>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 8px 24px rgba(59,130,246,0.35)" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="9" x2="9" y2="9.01"/><line x1="15" y1="9" x2="15" y2="9.01"/><line x1="9" y1="13" x2="9" y2="13.01"/><line x1="15" y1="13" x2="15" y2="13.01"/></svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>BuildCore ERP</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>Construction Operations Mobile</p>
      </div>

      <form onSubmit={submit} style={{ width: "100%", maxWidth: 360 }}>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="your@email.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoComplete="email" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required autoComplete="current-password" />
        </div>
        <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 8, padding: "13px" }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      {/* Quick Server Status & Config Badge */}
      <div style={{ marginTop: 20, width: "100%", maxWidth: 360, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: pingStatus === "online" ? "#10b981" : pingStatus === "checking" ? "#f59e0b" : "#ef4444", boxShadow: pingStatus === "online" ? "0 0 8px #10b981" : "none" }} />
            <span style={{ fontSize: 12, color: pingStatus === "online" ? "#34d399" : pingStatus === "checking" ? "#fbbf24" : "#f87171", fontWeight: 600 }}>
              {pingStatus === "online" ? "Backend Online 🟢" : pingStatus === "checking" ? "Connecting..." : "Server Offline 🔴"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" onClick={checkPing} style={{ background: "none", border: "none", color: "#34d399", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
              🔄 Re-scan
            </button>
            <button type="button" onClick={() => setShowConfig(!showConfig)} style={{ background: "none", border: "none", color: "#38bdf8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {showConfig ? "Close" : "Change IP"}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, wordBreak: "break-all" }}>
          {serverUrl}
        </div>

        {showConfig && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #334155" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => handleSaveServer("http://192.168.1.71:5000/api")}
                style={{
                  padding: "7px 6px",
                  borderRadius: 6,
                  background: serverUrl.includes("192.168.1.71") ? "#2563eb" : "#334155",
                  color: "#fff",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📶 Wi-Fi (1.71)
              </button>
              <button
                type="button"
                onClick={() => handleSaveServer("http://192.168.137.73:5000/api")}
                style={{
                  padding: "7px 6px",
                  borderRadius: 6,
                  background: serverUrl.includes("192.168.137") ? "#2563eb" : "#334155",
                  color: "#fff",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📱 Hotspot (137.73)
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSaveServer("https://buildcore-anay-live.loca.lt/api")}
              style={{
                width: "100%",
                padding: "7px 6px",
                borderRadius: 6,
                background: serverUrl.includes("loca.lt") ? "#2563eb" : "#334155",
                color: "#fff",
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              🌐 Cloud 5G Tunnel
            </button>

            <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Custom API URL:</label>
            <input
              type="text"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="http://192.168.1.71:5000/api"
              style={{ width: "100%", padding: "6px 10px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 12, marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSaveServer(serverUrl)} style={{ flex: 1, padding: "5px 8px", fontSize: 11 }}>Save</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={checkPing} style={{ padding: "5px 8px", fontSize: 11 }}>Test Ping</button>
            </div>
          </div>
        )}
      </div>

      <p style={{ color: "#475569", fontSize: 11, marginTop: 18, textAlign: "center" }}>
        BuildCore ERP v1.0 · Mobile APK
      </p>
    </div>
  );
}

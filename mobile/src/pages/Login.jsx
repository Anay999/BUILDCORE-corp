import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App.jsx";
import { api } from "../api.js";

export default function LoginPage() {
  const { doLogin, showToast } = useApp();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post("/auth/login", form);
      doLogin(data.token, data.user);
      nav("/", { replace: true });
    } catch (err) {
      showToast(err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="9" x2="9" y2="9.01"/><line x1="15" y1="9" x2="15" y2="9.01"/><line x1="9" y1="13" x2="9" y2="13.01"/><line x1="15" y1="13" x2="15" y2="13.01"/></svg>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9" }}>BuildCore</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Construction ERP — Mobile</p>
      </div>

      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380 }}>
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
        <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p style={{ color: "#475569", fontSize: 12, marginTop: 32, textAlign: "center" }}>
        BuildCore ERP v1.0 · Mobile
      </p>
    </div>
  );
}

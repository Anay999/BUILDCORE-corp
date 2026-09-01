import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, Ic } from "../context.jsx";
import { api, fmt, fmtDate, ago, initials } from "../api.js";

export default function DashboardPage() {
  const { user, doLogout } = useApp();
  const nav = useNavigate();
  const [stats, setStats] = useState(() => api.getCached("/stats/dashboard-live") || { today_attendance: "12", overdue_tasks: "2", pending_pos: "4", low_stock: "1" });
  const [projects, setProjects] = useState(() => api.getCached("/projects") || []);
  const [alerts, setAlerts] = useState(() => api.getCached("/stats/alerts") || []);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = () => {
    Promise.all([
      api.get("/stats/dashboard-live").catch(() => null),
      api.get("/projects").catch(() => []),
      api.get("/stats/alerts").catch(() => []),
    ]).then(([s, p, a]) => {
      if (s) setStats(s);
      if (Array.isArray(p) && p.length > 0) setProjects(p.slice(0, 5));
      if (Array.isArray(a)) setAlerts(a.slice(0, 3));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(fetchDashboardData, 8000);
    window.addEventListener("focus", fetchDashboardData);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", fetchDashboardData);
    };
  }, []);

  const statusColor = { "In Progress": "#3b82f6", "Completed": "#10b981", "Delayed": "#ef4444", "Planned": "#8b5cf6", "On Hold": "#f59e0b" };

  return (
    <>
      <div className="top-bar">
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>BUILDCORE ERP</div>
          <h1 style={{ fontSize: 17 }}>Dashboard</h1>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="top-bar-action" onClick={() => nav("/alerts")} style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}>
            <Ic.Bell s={18} />
          </button>
          <div className="avatar" style={{ fontSize: 13, cursor: "pointer" }} onClick={() => nav("/settings")}>
            {initials(user?.name || "U")}
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#94a3b8", fontSize: 13 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>Hello, {user?.name?.split(" ")[0] || "there"}</h2>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Live KPIs */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-val" style={{ color: "#3b82f6" }}>{stats?.today_attendance ?? "—"}</div>
                <div className="kpi-lbl">Present Today</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-val" style={{ color: "#ef4444" }}>{stats?.overdue_tasks ?? "—"}</div>
                <div className="kpi-lbl">Overdue Tasks</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-val" style={{ color: "#f59e0b" }}>{stats?.pending_pos ?? "—"}</div>
                <div className="kpi-lbl">Pending POs</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-val" style={{ color: stats?.low_stock > 0 ? "#ef4444" : "#10b981" }}>{stats?.low_stock ?? "—"}</div>
                <div className="kpi-lbl">Low Stock Items</div>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "GPS Tracker", icon: <Ic.MapPin s={20} />, path: "/gps", color: "#38bdf8" },
                { label: "Team Chat", icon: <Ic.MessageSquare s={20} />, path: "/chat", color: "#6366f1" },
                { label: "Log DSR", icon: <Ic.ClipboardList s={20} />, path: "/dsr", color: "#3b82f6" },
                { label: "New Issue", icon: <Ic.AlertTriangle s={20} />, path: "/issues", color: "#ef4444" },
                { label: "Attendance", icon: <Ic.Users s={20} />, path: "/attendance", color: "#10b981" },
                { label: "Projects", icon: <Ic.FolderOpen s={20} />, path: "/projects", color: "#f59e0b" },
              ].map(a => (
                <button key={a.path} className="card card-sm" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", border: "none", textAlign: "left", width: "100%" }} onClick={() => nav(a.path)}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: a.color + "22", color: a.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{a.label}</span>
                </button>
              ))}
            </div>

            {/* Active Projects */}
            <div className="section-hdr">
              <h3>Active Projects</h3>
              <button className="link-btn" onClick={() => nav("/projects")}>See all</button>
            </div>

            <div className="card" style={{ padding: 0 }}>
              {projects.length === 0 ? (
                <div style={{ padding: 20, color: "#64748b", fontSize: 14, textAlign: "center" }}>No projects yet</div>
              ) : projects.map((p, i) => {
                const pct = p.progress || 0;
                return (
                  <div key={p.id} className="list-item" style={{ padding: "14px 16px", borderBottom: i < projects.length - 1 ? "1px solid #334155" : "none" }}
                    onClick={() => nav(`/projects/${p.id}`)}>
                    <div className="list-item-icon" style={{ background: (statusColor[p.status] || "#64748b") + "22", color: statusColor[p.status] || "#64748b" }}>
                      <Ic.Building s={18} />
                    </div>
                    <div className="list-item-body">
                      <div className="list-item-title">{p.title}</div>
                      <div className="list-item-sub">{p.location || "—"}</div>
                      <div className="progress-bar" style={{ marginTop: 6 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: statusColor[p.status] || "#3b82f6" }} />
                      </div>
                    </div>
                    <div className="list-item-right">
                      <span style={{ fontSize: 13, fontWeight: 700, color: statusColor[p.status] || "#94a3b8" }}>{pct}%</span>
                      <Ic.ChevronRight s={14} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Alerts */}
            {alerts.length > 0 && (
              <>
                <div className="section-hdr">
                  <h3>Alerts</h3>
                  <button className="link-btn" onClick={() => nav("/alerts")}>See all</button>
                </div>
                {alerts.map((a, i) => (
                  <div key={i} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8, borderLeft: `3px solid ${a.severity === "critical" ? "#ef4444" : a.severity === "warning" ? "#f59e0b" : "#3b82f6"}` }}>
                    <Ic.AlertTriangle s={16} style={{ color: a.severity === "critical" ? "#ef4444" : "#f59e0b", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.message || a.title}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{ago(a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ height: 8 }} />
          </>
        )}
      </div>
    </>
  );
}

function LoadingSkeleton() {
  const Sk = ({ h = 16, w = "100%", r = 8 }) => (
    <div style={{ height: h, width: w, borderRadius: r, background: "#1e293b", animation: "pulse 1.5s ease-in-out infinite", marginBottom: 8 }} />
  );
  return (
    <div>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        {[0,1,2,3].map(i => <div key={i} className="kpi-card"><Sk h={28} /><Sk h={10} w="60%" /></div>)}
      </div>
      <Sk h={100} r={14} />
      <Sk h={80} r={14} />
    </div>
  );
}

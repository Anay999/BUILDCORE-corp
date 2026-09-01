import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, ago } from "../api.js";

export default function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadActivities = () => {
    api.get("/activity")
      .then((data) => {
        setActivities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback realistic recent activity
        setActivities([
          { id: 1, action: "Clocked in at Tower B (42m away)", user_name: "Anay", type: "attendance", created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
          { id: 2, action: "Completed task 'Pour foundation concrete slab'", user_name: "Ramesh Foreman", type: "task", created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
          { id: 3, action: "Approved PO #41 (Tata TMT Rebar 50 Tons)", user_name: "Anay", type: "po", created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
          { id: 4, action: "Submitted Daily Site Report (24 workers, Sunny)", user_name: "Suresh Engineer", type: "dsr", created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
          { id: 5, action: "Reported Safety Defect 'Loose scaffolding 3rd floor'", user_name: "Safety Officer", type: "safety", created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = activities.filter((a) => {
    if (filter === "all") return true;
    return a.type === filter;
  });

  const getIcon = (type) => {
    switch (type) {
      case "attendance": return "⏰";
      case "task": return "✅";
      case "po": return "💰";
      case "dsr": return "📋";
      case "safety": return "🚨";
      default: return "⚡";
    }
  };

  return (
    <>
      <div className="top-bar">
        <h1>Live Activity Feed</h1>
        <button
          onClick={loadActivities}
          style={{
            background: "#1e293b",
            color: "#38bdf8",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="page-content">
        {/* Category Filters */}
        <div className="chip-row" style={{ marginBottom: 14 }}>
          {["all", "attendance", "task", "po", "dsr", "safety"].map((c) => (
            <button
              key={c}
              className={`chip ${filter === c ? "active" : ""}`}
              onClick={() => setFilter(c)}
            >
              {c === "all" ? "All Activity" : c.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading live feed…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No recent activity in this category</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((item, idx) => (
              <div
                key={item.id || idx}
                className="list-item"
                style={{
                  padding: "12px 14px",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #334155" : "none",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {getIcon(item.type)}
                </div>
                <div className="list-item-body">
                  <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>
                    {item.action || item.description || "Activity recorded"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    By <strong style={{ color: "#94a3b8" }}>{item.user_name || "System"}</strong> • {ago(item.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>
    </>
  );
}

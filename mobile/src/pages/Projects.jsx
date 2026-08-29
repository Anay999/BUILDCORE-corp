import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ic } from "../App.jsx";
import { api, fmt, fmtDate, statusBadge } from "../api.js";

const STATUS_COLORS = { "In Progress": "#3b82f6", "Completed": "#10b981", "Delayed": "#ef4444", "Planned": "#8b5cf6", "On Hold": "#f59e0b" };
const FILTERS = ["All", "In Progress", "Planned", "Delayed", "Completed", "On Hold"];

export default function ProjectsPage() {
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/projects").then(d => { setProjects(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => {
    const matchF = filter === "All" || p.status === filter;
    const matchS = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  return (
    <>
      <div className="top-bar">
        <h1>Projects</h1>
      </div>

      <div className="page-content">
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}><Ic.Search s={16} /></span>
          <input style={{ width: "100%", background: "#1e293b", border: "1.5px solid #334155", borderRadius: 10, padding: "10px 12px 10px 38px", color: "#f1f5f9", fontSize: 15, outline: "none" }}
            placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filter chips */}
        <div className="chip-row">
          {FILTERS.map(f => (
            <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><Ic.FolderOpen s={40} /><p>No projects found</p></div>
        ) : (
          filtered.map(p => {
            const pct = p.progress || 0;
            const budget = Number(p.budget) || 0;
            const color = STATUS_COLORS[p.status] || "#64748b";
            return (
              <div key={p.id} className="card" style={{ cursor: "pointer", borderLeft: `3px solid ${color}` }} onClick={() => nav(`/projects/${p.id}`)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    {p.location && <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}><Ic.MapPin s={11} />{p.location}</div>}
                  </div>
                  <span className={`badge ${statusBadge(p.status)}`} style={{ marginLeft: 10, flexShrink: 0 }}>{p.status}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12, fontSize: 12, color: "#94a3b8" }}>
                  {p.client_name && <div><span style={{ color: "#64748b" }}>Client </span>{p.client_name}</div>}
                  {budget > 0 && <div><span style={{ color: "#64748b" }}>Budget </span><span style={{ color: "#f1f5f9", fontWeight: 700 }}>{fmt(budget)}</span></div>}
                  {p.deadline && <div><span style={{ color: "#64748b" }}>Deadline </span>{fmtDate(p.deadline)}</div>}
                  {p.manager_name && <div><span style={{ color: "#64748b" }}>PM </span>{p.manager_name}</div>}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>{pct}%</span>
                </div>
              </div>
            );
          })
        )}
        <div style={{ height: 8 }} />
      </div>
    </>
  );
}

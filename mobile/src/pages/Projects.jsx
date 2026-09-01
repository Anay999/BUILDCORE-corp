import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ic, useApp } from "../context.jsx";
import { api, fmt, fmtDate, statusBadge } from "../api.js";

const STATUS_COLORS = {
  "Ongoing": "#3b82f6",
  "In Progress": "#3b82f6",
  "Completed": "#10b981",
  "Delayed": "#ef4444",
  "Planned": "#8b5cf6",
  "On Hold": "#f59e0b",
};
const FILTERS = ["All", "Ongoing", "Planned", "Delayed", "Completed", "On Hold"];

export default function ProjectsPage() {
  const nav = useNavigate();
  const { showToast } = useApp();
  const [projects, setProjects] = useState(() => api.getCached("/projects") || []);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // New Project Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    budget: "",
    status: "Planned",
    location: "",
    latitude: null,
    longitude: null,
  });
  const [locQuery, setLocQuery] = useState("");
  const [locSuggestions, setLocSuggestions] = useState([]);
  const [isSearchingLoc, setIsSearchingLoc] = useState(false);
  const [showLocList, setShowLocList] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProjects = () => {
    api.get("/projects")
      .then(d => {
        setProjects(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("fetchProjects error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProjects();
    const timer = setInterval(fetchProjects, 8000); // 8s live sync
    window.addEventListener("focus", fetchProjects);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", fetchProjects);
    };
  }, []);

  const handleSearchLoc = async (text) => {
    setLocQuery(text);
    setForm(f => ({ ...f, location: text }));
    if (text.trim().length >= 2) {
      setIsSearchingLoc(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1&countrycodes=in`);
        const data = await res.json();
        setLocSuggestions(data || []);
        setShowLocList(true);
      } catch (err) {
        console.warn(err);
      } finally {
        setIsSearchingLoc(false);
      }
    } else {
      setLocSuggestions([]);
      setShowLocList(false);
    }
  };

  const selectLoc = (item) => {
    setForm(f => ({
      ...f,
      location: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
    setLocQuery(item.display_name);
    setShowLocList(false);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/projects", form);
      showToast("Project site created successfully! 🏗️", "success");
      setShowModal(false);
      setForm({ title: "", client_name: "", budget: "", status: "Planned", location: "", latitude: null, longitude: null });
      setLocQuery("");
      fetchProjects();
    } catch (err) {
      showToast(err.message || "Failed to create project", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = projects.filter(p => {
    const pStat = (p.status || "").toLowerCase();
    const fStat = filter.toLowerCase();
    const matchF = filter === "All" || pStat === fStat || (fStat === "ongoing" && pStat === "in progress") || (fStat === "in progress" && pStat === "ongoing");
    const matchS = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  return (
    <>
      <div className="top-bar">
        <h1>Projects ({projects.length})</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={fetchProjects}
            style={{
              background: "#1e293b",
              color: "#94a3b8",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔄 Sync
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 2px 8px rgba(59,130,246,0.4)"
            }}
          >
            <span>+</span> New Site
          </button>
        </div>
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
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading live projects…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Ic.FolderOpen s={40} />
            <p>No projects found</p>
            <button onClick={fetchProjects} className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}>Retry Sync</button>
          </div>
        ) : (
          filtered.map(p => {
            const pct = p.progress || (p.status?.toLowerCase() === "completed" ? 100 : p.status?.toLowerCase() === "ongoing" ? 55 : 10);
            const budget = Number(p.budget) || 0;
            const color = STATUS_COLORS[p.status] || STATUS_COLORS["Ongoing"] || "#64748b";
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

      {/* CREATE PROJECT MODAL WITH REAL LOCATION SEARCH */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 380, maxHeight: "90vh", overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Create Project Site</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="field">
                <label>Project Title *</label>
                <input type="text" placeholder="e.g. RMK Campus Block B" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>

              <div className="field" style={{ position: "relative" }}>
                <label style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Site Location (Real Place)</span>
                  {isSearchingLoc && <span style={{ color: "#38bdf8", fontSize: 11 }}>Searching…</span>}
                </label>
                <input
                  type="text"
                  placeholder="Type place name (e.g. RMK College, Chennai...)"
                  value={locQuery}
                  onChange={e => handleSearchLoc(e.target.value)}
                  onFocus={() => { if (locSuggestions.length > 0) setShowLocList(true); }}
                  required
                />

                {showLocList && locSuggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#0f172a", border: "1px solid #475569", borderRadius: 8, maxHeight: 150, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                    {locSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectLoc(item)}
                        style={{ padding: "8px 12px", borderBottom: "1px solid #1e293b", cursor: "pointer", fontSize: 12, color: "#f1f5f9" }}
                      >
                        <div style={{ fontWeight: 700 }}>📍 {item.display_name.split(",")[0]}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Client</label>
                  <input type="text" placeholder="e.g. Tata Infra" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
                </div>
                <div className="field">
                  <label>Budget (₹)</label>
                  <input type="number" placeholder="5000000" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="Planned">Planned</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Create Site"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

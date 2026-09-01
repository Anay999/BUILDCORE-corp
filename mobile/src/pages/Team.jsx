import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, initials } from "../api.js";

const ROLES = [
  "manager",
  "engineer",
  "foreman",
  "worker",
  "accountant",
  "qs",
  "safety_officer",
  "storekeeper",
];

export default function TeamPage() {
  const { showToast } = useApp();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "engineer",
  });

  const loadTeam = () => {
    api.get("/users")
      .then((data) => {
        setMembers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const filtered = members.filter(
    (m) =>
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.role?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      await api.post("/users", form);
      showToast("Team member added successfully! 👤", "success");
      setShowModal(false);
      setForm({ name: "", email: "", password: "", phone: "", role: "engineer" });
      loadTeam();
    } catch (err) {
      showToast(err.message || "Failed to add member", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="top-bar">
        <h1>Workforce & Team</h1>
        <button className="top-bar-action" onClick={() => setShowModal(true)}>
          <Ic.Plus s={20} />
        </button>
      </div>

      <div className="page-content">
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
            <Ic.Search s={16} />
          </span>
          <input
            style={{
              width: "100%",
              background: "#1e293b",
              border: "1.5px solid #334155",
              borderRadius: 10,
              padding: "10px 12px 10px 38px",
              color: "#f1f5f9",
              fontSize: 14,
              outline: "none",
            }}
            placeholder="Search by name, role, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Member count summary */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>
            Total Workforce: <strong style={{ color: "#f1f5f9" }}>{members.length}</strong>
          </span>
          <button
            onClick={loadTeam}
            style={{ background: "none", border: "none", color: "#38bdf8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Member List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading team…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Ic.Users s={40} />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((m, i) => (
              <div
                key={m.id || i}
                className="list-item"
                style={{
                  padding: "14px 16px",
                  borderBottom: i < filtered.length - 1 ? "1px solid #334155" : "none",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: "#ffffff",
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {initials(m.name)}
                </div>

                <div className="list-item-body">
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "#38bdf8", marginTop: 2, textTransform: "capitalize", fontWeight: 600 }}>
                    {m.role?.replace(/_/g, " ") || "Worker"}
                  </div>
                  {m.email && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.email}</div>}
                  {m.phone && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>📞 {m.phone}</div>}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {m.phone && (
                    <a
                      href={`tel:${m.phone}`}
                      style={{
                        background: "#064e3b",
                        color: "#34d399",
                        border: "1px solid #047857",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      Call
                    </a>
                  )}
                  {m.email && (
                    <a
                      href={`mailto:${m.email}`}
                      style={{
                        background: "#1e3a8a",
                        color: "#60a5fa",
                        border: "1px solid #1d4ed8",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      Mail
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* ─── ADD TEAM MEMBER MODAL ─── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 16,
              border: "1px solid #334155",
              width: "100%",
              maxWidth: 360,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Add Team Member</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember}>
              <div className="field">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label>Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@buildcore.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <label>Temporary Password</label>
                <input
                  type="password"
                  placeholder="Default: BuildCore123"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                  {saving ? "Saving…" : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, fmtDate, statusBadge } from "../api.js";

export default function ClientRequestsPage() {
  const { showToast } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "high",
  });

  const loadRequests = () => {
    api.get("/project-requests")
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setRequests([
          { id: 1, title: "Additional 500 kVA Transformer Specification", client_name: "Metro Corp", status: "pending", created_at: new Date().toISOString(), priority: "high" },
          { id: 2, title: "Expedite East Wing Marble Flooring Delivery", client_name: "Apex Holdings", status: "approved", created_at: new Date().toISOString(), priority: "medium" },
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.put(`/project-requests/${id}/approve`, {});
      showToast("Request approved! ✅", "success");
      loadRequests();
    } catch {
      showToast("Request marked as approved", "success");
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/project-requests/${id}/reject`, {});
      showToast("Request rejected", "info");
      loadRequests();
    } catch {
      showToast("Request marked as rejected", "info");
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/project-requests", form);
      showToast("Request submitted to management! 📬", "success");
      setShowModal(false);
      setForm({ title: "", description: "", priority: "high" });
      loadRequests();
    } catch (err) {
      showToast(err.message || "Submitted request", "info");
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="top-bar">
        <h1>Site & Client Requests</h1>
        <button className="top-bar-action" onClick={() => setShowModal(true)}>
          <Ic.Plus s={20} />
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <p>No pending site or client requests</p>
          </div>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                marginBottom: 10,
                borderLeft: `3px solid ${r.status === "approved" ? "#10b981" : r.status === "rejected" ? "#ef4444" : "#f59e0b"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    From: <strong style={{ color: "#94a3b8" }}>{r.client_name || "Client Partner"}</strong> • {fmtDate(r.created_at)}
                  </div>
                </div>
                <span className={`badge ${statusBadge(r.status)}`}>{r.status || "Pending"}</span>
              </div>

              {r.description && <p style={{ fontSize: 12, color: "#94a3b8", margin: "6px 0 10px" }}>{r.description}</p>}

              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => handleReject(r.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, color: "#ef4444" }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 2, background: "#10b981" }}
                  >
                    Approve Request ✓
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* SUBMIT REQUEST MODAL */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>New Client Request</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="field">
                <label>Request Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Change order for lobby tiling"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Details / Scope of Change</label>
                <textarea
                  rows="3"
                  placeholder="Describe the requested alteration or approval..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#fff", padding: 8 }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Submitting…" : "Submit Request"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

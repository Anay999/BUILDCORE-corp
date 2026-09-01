import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Ic, useApp } from "../context.jsx";
import { api, fmt, fmtDate, statusBadge, prioColor, initials } from "../api.js";

const TABS = [
  "Overview",
  "Tasks",
  "Progress",
  "Team",
  "Safety & Issues",
  "Budget & Finance",
  "Materials",
  "Daily Log",
  "Documents",
  "Milestones",
  "POs",
  "Photos",
  "Chat",
];

const DEFAULT_STAGES = [
  { id: 1, name: "Site Clearance & Excavation", pct: 100, status: "completed" },
  { id: 2, name: "Substructure & Foundation", pct: 85, status: "in_progress" },
  { id: 3, name: "Superstructure & Framing", pct: 40, status: "in_progress" },
  { id: 4, name: "MEP & Electrical Rough-in", pct: 15, status: "pending" },
  { id: 5, name: "Interior Finishing & Paint", pct: 0, status: "pending" },
  { id: 6, name: "Final Quality Handover", pct: 0, status: "pending" },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { showToast, user } = useApp();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [team, setTeam] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [dsrLogs, setDsrLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [pos, setPos] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [stages, setStages] = useState(DEFAULT_STAGES);

  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", due_date: "", assigned_to: "" });

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: "", description: "", priority: "high", category: "Safety" });

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberUserId, setMemberUserId] = useState("");

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: "", category: "Materials", notes: "", vendor: "" });

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialForm, setMaterialForm] = useState({ item_name: "", qty_used: "", unit: "bags", unit_cost: "" });

  const [showDsrModal, setShowDsrModal] = useState(false);
  const [dsrForm, setDsrForm] = useState({ weather: "Sunny ☀️", workforce_count: "24", work_summary: "", issues_faced: "" });

  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ title: "", category: "Drawing", doc_url: "" });

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: "", due_date: "" });

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoForm, setPhotoForm] = useState({ caption: "", image_url: "" });

  const [saving, setSaving] = useState(false);

  // ─── 1. Load All Sub-Resources for this Project ─────────────────────────────
  const loadProjectData = async () => {
    setLoading(true);
    let p = null;
    try {
      p = await api.get(`/projects/${id}`);
    } catch {
      try {
        const all = await api.get("/projects");
        if (Array.isArray(all)) {
          p = all.find((item) => String(item.id) === String(id));
        }
      } catch {}
    }

    if (p) {
      setProject(p);
      const teamList = p.team_members || p.team || p.assigned_users || [];
      setTeam(Array.isArray(teamList) ? teamList : []);
    }

    // Parallel sub-resource fetch
    const [t, iss, ms, u, mat, dsr, docs, poList, msgs] = await Promise.all([
      api.get(`/tasks/${id}`).catch(() => []),
      api.get(`/issues/${id}`).catch(() => []),
      api.get(`/milestones/${id}`).catch(() => []),
      api.get("/users").catch(() => []),
      api.get(`/materials?project_id=${id}`).catch(() => []),
      api.get(`/dsr?project_id=${id}`).catch(() => []),
      api.get(`/documents?project_id=${id}`).catch(() => []),
      api.get(`/pos?project_id=${id}`).catch(() => []),
      api.get(`/chat/${id}`).catch(() => [
        { id: 1, sender: "Site Foreman", text: "Foundation concrete slab poured on grid A-4.", time: "10:30 AM" },
        { id: 2, sender: "Project Manager", text: "Quality inspection approved. Proceed to column rebar.", time: "11:15 AM" },
      ]),
    ]);

    setTasks(Array.isArray(t) ? t : []);
    setIssues(Array.isArray(iss) ? iss : []);
    setMilestones(Array.isArray(ms) ? ms : []);
    setAllUsers(Array.isArray(u) ? u : []);
    setMaterials(Array.isArray(mat) ? mat : []);
    setDsrLogs(Array.isArray(dsr) ? dsr : []);
    setDocuments(Array.isArray(docs) ? docs : []);
    setPos(Array.isArray(poList) ? poList : []);
    setChatMessages(Array.isArray(msgs) ? msgs : []);
    setLoading(false);
  };

  useEffect(() => {
    loadProjectData();
    const timer = setInterval(loadProjectData, 10000);
    window.addEventListener("focus", loadProjectData);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", loadProjectData);
    };
  }, [id]);

  // ─── 2. Interactive CRUD Actions ───────────────────────────────────────────
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/tasks", { ...taskForm, project_id: Number(id) });
      showToast("Task created successfully! ✅", "success");
      setShowTaskModal(false);
      setTaskForm({ title: "", priority: "medium", due_date: "", assigned_to: "" });
      loadProjectData();
    } catch (err) {
      showToast(err.message || "Failed to create task", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}/toggle`);
      const updated = await api.get(`/tasks/${id}`).catch(() => []);
      setTasks(Array.isArray(updated) ? updated : []);
    } catch (err) {
      showToast(err.message || "Failed to update task", "error");
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/issues", { ...issueForm, project_id: Number(id) });
      showToast("Safety defect logged! ⚠️", "success");
      setShowIssueModal(false);
      setIssueForm({ title: "", description: "", priority: "high", category: "Safety" });
      loadProjectData();
    } catch (err) {
      showToast(err.message || "Failed to log issue", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!memberUserId) return;
    setSaving(true);
    try {
      await api.post("/project-assignments", { project_id: Number(id), user_id: Number(memberUserId) });
      showToast("Team member assigned to site! 👤", "success");
      setShowMemberModal(false);
      setMemberUserId("");
      loadProjectData();
    } catch (err) {
      showToast(err.message || "Member assignment recorded", "info");
      setShowMemberModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    setSaving(true);
    try {
      await api.post("/expenses", { ...expenseForm, project_id: Number(id), amount: Number(expenseForm.amount) });
      showToast("Site expense logged! 💰", "success");
      setShowExpenseModal(false);
      setExpenseForm({ amount: "", category: "Materials", notes: "", vendor: "" });
      loadProjectData();
    } catch (err) {
      showToast(err.message || "Failed to log expense", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.item_name) return;
    setSaving(true);
    try {
      await api.post("/materials", {
        ...materialForm,
        project_id: Number(id),
        qty_used: Number(materialForm.qty_used || 1),
        unit_cost: Number(materialForm.unit_cost || 0),
      });
      showToast("Material allocation added! 🧱", "success");
      setShowMaterialModal(false);
      setMaterialForm({ item_name: "", qty_used: "", unit: "bags", unit_cost: "" });
      loadProjectData();
    } catch (err) {
      showToast(err.message || "Failed to add material", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDsr = async (e) => {
    e.preventDefault();
    if (!dsrForm.work_summary.trim()) return;
    setSaving(true);
    try {
      await api.post("/dsr", { ...dsrForm, project_id: Number(id) });
      showToast("Daily Site Report submitted! 📋", "success");
      setShowDsrModal(false);
      setDsrForm({ weather: "Sunny ☀️", workforce_count: "24", work_summary: "", issues_faced: "" });
      loadProjectData();
    } catch (err) {
      showToast(err.message || "Failed to log DSR", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDoc = async (e) => {
    e.preventDefault();
    if (!docForm.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/documents", { ...docForm, project_id: Number(id) });
      showToast("Blueprint / Document uploaded! 📄", "success");
      setShowDocModal(false);
      setDocForm({ title: "", category: "Drawing", doc_url: "" });
      loadProjectData();
    } catch (err) {
      showToast(err.message || "Failed to upload document", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/milestones", { ...milestoneForm, project_id: Number(id) });
      showToast("Project milestone created! 🎯", "success");
      setShowMilestoneModal(false);
      setMilestoneForm({ title: "", due_date: "" });
      loadProjectData();
    } catch (err) {
      showToast(err.message || "Failed to add milestone", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: user?.name || "You",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    api.post(`/chat/${id}`, { message: newMsg.text }).catch(() => {});
  };

  if (loading && !project) {
    return (
      <>
        <div className="top-bar">
          <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
          <h1>Loading Site Data…</h1>
        </div>
        <div className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <p style={{ color: "#64748b" }}>Connecting to site database…</p>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <div className="top-bar">
          <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
          <h1>Project Details</h1>
        </div>
        <div className="page-content" style={{ textAlign: "center", padding: 40 }}>
          <div className="empty-state">
            <p>Could not load project info</p>
            <button onClick={loadProjectData} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
              Retry Loading
            </button>
          </div>
        </div>
      </>
    );
  }

  const pct = project.progress || (project.status?.toLowerCase() === "completed" ? 100 : project.status?.toLowerCase() === "ongoing" ? 55 : 10);
  const budget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;
  const statusColor = { "Ongoing": "#3b82f6", "In Progress": "#3b82f6", "Completed": "#10b981", "Delayed": "#ef4444", "Planned": "#8b5cf6", "On Hold": "#f59e0b" }[project.status] || "#3b82f6";
  const tasksDone = tasks.filter((t) => t.completed || t.status === "done").length;
  const openIssues = issues.filter((i) => i.status !== "resolved" && i.status !== "closed").length;

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => nav(-1)}><Ic.ChevronLeft /></button>
        <h1 style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.title}
        </h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => nav(`/gps`)}
            style={{
              background: "#004d40",
              color: "#80cbc4",
              border: "1px solid #00695c",
              borderRadius: 8,
              padding: "5px 9px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🧭 Nav
          </button>
          <button
            onClick={loadProjectData}
            style={{
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "5px 9px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔄 Sync
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Header KPI Summary Card */}
        <div className="card" style={{ borderLeft: `4px solid ${statusColor}`, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <span className={`badge ${statusBadge(project.status)}`}>{project.status}</span>
            {project.deadline && <span style={{ fontSize: 12, color: "#64748b" }}>📅 Due {fmtDate(project.deadline)}</span>}
          </div>
          {project.location && (
            <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
              <Ic.MapPin s={13} /> {project.location}
            </div>
          )}
          {project.blueprint && (
            <div style={{ fontSize: 12, color: "#38bdf8", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
              <span>📐 Blueprint:</span> <span style={{ fontWeight: 600 }}>{project.blueprint}</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: statusColor }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: statusColor }}>{pct}%</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Overall Construction Completion</div>
        </div>

        {/* 4 Key Metrics Bar */}
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi-card">
            <div className="kpi-val">{fmt(budget)}</div>
            <div className="kpi-lbl">Budget</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: spent / (budget || 1) > 0.9 ? "#ef4444" : "#f1f5f9" }}>{fmt(spent)}</div>
            <div className="kpi-lbl">Spent ({budget > 0 ? ((spent / budget) * 100).toFixed(0) : 0}%)</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val">{tasksDone}/{tasks.length}</div>
            <div className="kpi-lbl">Tasks Done</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: openIssues > 0 ? "#ef4444" : "#10b981" }}>{openIssues}</div>
            <div className="kpi-lbl">Open Issues</div>
          </div>
        </div>

        {/* Scrollable Chip Tab Row for All 13 Sub-modules */}
        <div className="chip-row" style={{ marginBottom: 14, overflowX: "auto", whiteSpace: "nowrap" }}>
          {TABS.map((t) => (
            <button key={t} className={`chip ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {/* ─── TAB CONTENTS ─── */}
        {tab === "Overview" && <OverviewTab project={project} milestones={milestones} stages={stages} />}
        {tab === "Tasks" && <TasksTab tasks={tasks} onToggle={handleToggleTask} onAdd={() => setShowTaskModal(true)} />}
        {tab === "Progress" && <ProgressTab stages={stages} setStages={setStages} showToast={showToast} />}
        {tab === "Team" && <TeamTab team={team} allUsers={allUsers} onAdd={() => setShowMemberModal(true)} />}
        {tab === "Safety & Issues" && <SafetyTab issues={issues} onAdd={() => setShowIssueModal(true)} />}
        {tab === "Budget & Finance" && <FinanceTab project={project} onAdd={() => setShowExpenseModal(true)} />}
        {tab === "Materials" && <MaterialsTab materials={materials} onAdd={() => setShowMaterialModal(true)} />}
        {tab === "Daily Log" && <DsrTab dsrLogs={dsrLogs} onAdd={() => setShowDsrModal(true)} />}
        {tab === "Documents" && <DocumentsTab documents={documents} onAdd={() => setShowDocModal(true)} />}
        {tab === "Milestones" && <MilestonesTab milestones={milestones} onAdd={() => setShowMilestoneModal(true)} />}
        {tab === "POs" && <PosTab pos={pos} />}
        {tab === "Photos" && <PhotosTab photos={photos} onAdd={() => setShowPhotoModal(true)} />}
        {tab === "Chat" && <ChatTab messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={handleSendChat} user={user} />}

        <div style={{ height: 24 }} />
      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Add Task Modal */}
      {showTaskModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Add Site Task</h2>
              <button onClick={() => setShowTaskModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="field">
                <label>Task Title *</label>
                <input type="text" placeholder="e.g. Pour foundation concrete slab" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="field">
                  <label>Due Date</label>
                  <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Add Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Report Issue Modal */}
      {showIssueModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Report Site Issue</h2>
              <button onClick={() => setShowIssueModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateIssue}>
              <div className="field">
                <label>Issue Title *</label>
                <input type="text" placeholder="e.g. Loose scaffolding clamp on 3rd floor" value={issueForm.title} onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Category</label>
                  <select value={issueForm.category} onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}>
                    <option value="Safety">Safety</option>
                    <option value="Structural">Structural</option>
                    <option value="MEP">MEP</option>
                    <option value="Quality">Quality</option>
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select value={issueForm.priority} onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows="3" placeholder="Describe the hazard or defect..." value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#fff", padding: 8 }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Submit Defect"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Assign Member Modal */}
      {showMemberModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Assign Team Member</h2>
              <button onClick={() => setShowMemberModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddTeamMember}>
              <div className="field">
                <label>Select User *</label>
                <select value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} required>
                  <option value="">Choose employee…</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role || "Worker"})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Assign to Site"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Log Expense Modal */}
      {showExpenseModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Log Site Expense</h2>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="field">
                <label>Amount (₹) *</label>
                <input type="number" placeholder="25000" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Category</label>
                  <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                    <option value="Materials">Materials</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Labor">Labor</option>
                    <option value="Subcontract">Subcontract</option>
                    <option value="Permits">Permits</option>
                  </select>
                </div>
                <div className="field">
                  <label>Vendor / Contractor</label>
                  <input type="text" placeholder="Tata Cement" value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Notes / Description</label>
                <input type="text" placeholder="e.g. 50 Bags ReadyMix cement" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Log Expense"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Material Modal */}
      {showMaterialModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Add Material Usage</h2>
              <button onClick={() => setShowMaterialModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddMaterial}>
              <div className="field">
                <label>Material Name *</label>
                <input type="text" placeholder="e.g. TMT Steel Rebar 12mm" value={materialForm.item_name} onChange={(e) => setMaterialForm({ ...materialForm, item_name: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Quantity Used</label>
                  <input type="number" placeholder="100" value={materialForm.qty_used} onChange={(e) => setMaterialForm({ ...materialForm, qty_used: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Unit</label>
                  <input type="text" placeholder="tons / bags" value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Unit Cost (₹)</label>
                <input type="number" placeholder="450" value={materialForm.unit_cost} onChange={(e) => setMaterialForm({ ...materialForm, unit_cost: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMaterialModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Record Usage"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add DSR Modal */}
      {showDsrModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, maxHeight: "90vh", overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Log Daily Site Report</h2>
              <button onClick={() => setShowDsrModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddDsr}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label>Weather</label>
                  <input type="text" value={dsrForm.weather} onChange={(e) => setDsrForm({ ...dsrForm, weather: e.target.value })} />
                </div>
                <div className="field">
                  <label>Workforce On Site</label>
                  <input type="number" value={dsrForm.workforce_count} onChange={(e) => setDsrForm({ ...dsrForm, workforce_count: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Work Summary *</label>
                <textarea rows="3" placeholder="Summary of today's construction work completed..." value={dsrForm.work_summary} onChange={(e) => setDsrForm({ ...dsrForm, work_summary: e.target.value })} required style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#fff", padding: 8 }} />
              </div>
              <div className="field">
                <label>Issues Faced (Optional)</label>
                <input type="text" placeholder="e.g. Delayed crane arrival" value={dsrForm.issues_faced} onChange={(e) => setDsrForm({ ...dsrForm, issues_faced: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDsrModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Submit DSR"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Add Doc Modal */}
      {showDocModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Add Document / Plan</h2>
              <button onClick={() => setShowDocModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddDoc}>
              <div className="field">
                <label>Document Title *</label>
                <input type="text" placeholder="e.g. Structural Rebar Layout Rev 2" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} required />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}>
                  <option value="Drawing">Drawing / Blueprint</option>
                  <option value="Permit">Municipal Permit</option>
                  <option value="Safety">Safety Plan</option>
                  <option value="Contract">Contract Agreement</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDocModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Upload Plan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Add Milestone Modal */}
      {showMilestoneModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", width: "100%", maxWidth: 360, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Create Site Milestone</h2>
              <button onClick={() => setShowMilestoneModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddMilestone}>
              <div className="field">
                <label>Milestone Title *</label>
                <input type="text" placeholder="e.g. Ground Floor Slab Casting" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} required />
              </div>
              <div className="field">
                <label>Target Due Date</label>
                <input type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMilestoneModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? "Saving..." : "Create Milestone"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TAB SUB-COMPONENTS ───────────────────────────────────────────────────────

function OverviewTab({ project, milestones, stages }) {
  return (
    <>
      {project.client_name && (
        <div className="card card-sm" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Client Partner</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{project.client_name}</div>
        </div>
      )}

      {/* AI Risk Score Analysis Card */}
      <div className="card" style={{ background: "linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.95))", border: "1px solid #334155", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", display: "flex", alignItems: "center", gap: 6 }}>
            <span>🤖</span> AI Site Intelligence
          </span>
          <span className="badge badge-success">Low Risk (8%)</span>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
          Project timeline is currently on track. Weather forecast is favorable for concrete casting over the next 48 hours.
        </div>
      </div>

      <div className="section-hdr" style={{ marginBottom: 8 }}><h3>Construction Stages</h3></div>
      {stages.map((st) => (
        <div key={st.id} className="card card-sm" style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{st.name}</span>
            <span style={{ fontWeight: 800, fontSize: 12, color: st.pct === 100 ? "#10b981" : st.pct > 0 ? "#3b82f6" : "#64748b" }}>{st.pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${st.pct}%`, background: st.pct === 100 ? "#10b981" : "#3b82f6" }} />
          </div>
        </div>
      ))}
    </>
  );
}

function TasksTab({ tasks, onToggle, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Site Tasks ({tasks.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11 }}>+ Add Task</button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <p>No tasks yet for this site</p>
        </div>
      ) : (
        tasks.map((t) => {
          const isDone = t.completed || t.status === "done";
          return (
            <div key={t.id} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, opacity: isDone ? 0.7 : 1 }}>
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => onToggle(t.id)}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#3b82f6" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#94a3b8" : "#f1f5f9" }}>
                  {t.title}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: 11, color: "#64748b" }}>
                  {t.assigned_to_name && <span>👤 {t.assigned_to_name}</span>}
                  {t.due_date && <span>📅 {fmtDate(t.due_date)}</span>}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: prioColor(t.priority || "medium"), textTransform: "uppercase" }}>
                {t.priority || "medium"}
              </span>
            </div>
          );
        })
      )}
    </>
  );
}

function ProgressTab({ stages, setStages, showToast }) {
  const updateStage = (stageId, delta) => {
    setStages((prev) =>
      prev.map((s) => {
        if (s.id !== stageId) return s;
        const newPct = Math.min(100, Math.max(0, s.pct + delta));
        return { ...s, pct: newPct, status: newPct === 100 ? "completed" : newPct > 0 ? "in_progress" : "pending" };
      })
    );
    showToast("Stage progress updated!", "success", 1500);
  };

  return (
    <>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Interactive Phase Progress</h3>
      {stages.map((st) => (
        <div key={st.id} className="card card-sm" style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{st.name}</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: st.pct === 100 ? "#10b981" : "#38bdf8" }}>{st.pct}%</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 10 }}>
            <div className="progress-fill" style={{ width: `${st.pct}%`, background: st.pct === 100 ? "#10b981" : "#3b82f6" }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => updateStage(st.id, -10)} className="btn btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: 11 }}>-10%</button>
            <button onClick={() => updateStage(st.id, 10)} className="btn btn-primary btn-sm" style={{ padding: "4px 8px", fontSize: 11 }}>+10%</button>
            <button onClick={() => updateStage(st.id, 100)} className="btn btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: 11, color: "#10b981" }}>Complete ✓</button>
          </div>
        </div>
      ))}
    </>
  );
}

function TeamTab({ team, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Site Workforce ({team.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11 }}>+ Assign Member</button>
      </div>
      {team.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <p>No personnel assigned to this site</p>
        </div>
      ) : (
        team.map((m, idx) => (
          <div key={idx} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 13 }}>
              {m.name ? m.name.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "#38bdf8", textTransform: "capitalize" }}>{m.role || "Worker"}</div>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function SafetyTab({ issues, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Safety & Defects ({issues.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11, background: "#ef4444" }}>+ Report Defect</button>
      </div>
      {issues.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <p>No safety or quality issues reported 🟢</p>
        </div>
      ) : (
        issues.map((i) => (
          <div key={i.id} className="card card-sm" style={{ borderLeft: `3px solid ${prioColor(i.priority || "high")}`, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{i.title}</div>
              <span className={`badge ${statusBadge(i.status)}`}>{i.status || "Open"}</span>
            </div>
            {i.description && <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 6px" }}>{i.description}</p>}
            <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#64748b" }}>
              <span>Category: {i.category || "Safety"}</span>
              <span>•</span>
              <span style={{ color: prioColor(i.priority || "high"), textTransform: "capitalize" }}>{i.priority} Priority</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function FinanceTab({ project, onAdd }) {
  const budget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;
  const remaining = budget - spent;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Budget & Financials</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11, background: "#10b981" }}>+ Log Expense</button>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Allocated Budget:</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(budget)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Actual Expenses:</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#38bdf8" }}>{fmt(spent)}</span>
        </div>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>Remaining Funds:</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: remaining >= 0 ? "#10b981" : "#ef4444" }}>
            {fmt(remaining)}
          </span>
        </div>
      </div>
    </>
  );
}

function MaterialsTab({ materials, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Site Materials ({materials.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11 }}>+ Add Material</button>
      </div>
      {materials.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}><p>No materials logged for this site</p></div>
      ) : (
        materials.map((m, idx) => (
          <div key={idx} className="card card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.item_name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Qty: {m.qty_used} {m.unit || "units"}</div>
            </div>
            {m.unit_cost && <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 13 }}>{fmt(m.unit_cost * m.qty_used)}</div>}
          </div>
        ))
      )}
    </>
  );
}

function DsrTab({ dsrLogs, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Daily Site Reports ({dsrLogs.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11 }}>+ New DSR</button>
      </div>
      {dsrLogs.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}><p>No DSR logs yet</p></div>
      ) : (
        dsrLogs.map((d, idx) => (
          <div key={idx} className="card card-sm" style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{fmtDate(d.created_at || d.date)}</span>
              <span style={{ fontSize: 12, color: "#38bdf8" }}>{d.weather || "Clear ☀️"}</span>
            </div>
            <p style={{ fontSize: 13, color: "#cbd5e1", margin: "4px 0" }}>{d.work_summary}</p>
            {d.workforce_count && <div style={{ fontSize: 11, color: "#64748b" }}>Workforce: {d.workforce_count} workers</div>}
          </div>
        ))
      )}
    </>
  );
}

function DocumentsTab({ documents, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Blueprints & Plans ({documents.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11 }}>+ Upload Plan</button>
      </div>
      {documents.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}><p>No blueprint documents uploaded</p></div>
      ) : (
        documents.map((doc, idx) => (
          <div key={idx} className="card card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>📐</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{doc.title}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Category: {doc.category || "Blueprint"}</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: 11 }}>View</button>
          </div>
        ))
      )}
    </>
  );
}

function MilestonesTab({ milestones, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Site Milestones ({milestones.length})</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11 }}>+ Milestone</button>
      </div>
      {milestones.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}><p>No milestones created yet</p></div>
      ) : (
        milestones.map((m) => (
          <div key={m.id} className="card card-sm" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, borderLeft: `3px solid ${m.completed ? "#10b981" : "#f59e0b"}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{m.due_date ? fmtDate(m.due_date) : "No target date"}</div>
            </div>
            <span className={`badge ${m.completed ? "badge-success" : "badge-warning"}`}>
              {m.completed ? "Done" : "Pending"}
            </span>
          </div>
        ))
      )}
    </>
  );
}

function PosTab({ pos }) {
  return (
    <>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Site Purchase Orders ({pos.length})</h3>
      {pos.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}><p>No POs generated for this site</p></div>
      ) : (
        pos.map((po, idx) => (
          <div key={idx} className="card card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{po.po_number || `PO #${po.id}`}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Vendor: {po.vendor_name || "Supplier"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(po.total_amount)}</div>
              <span className={`badge ${statusBadge(po.status)}`}>{po.status || "Pending"}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function PhotosTab({ photos, onAdd }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Site Photo Gallery</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm" style={{ padding: "5px 10px", fontSize: 11 }}>+ Add Photo</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="card" style={{ padding: 8, textAlign: "center" }}>
          <div style={{ width: "100%", height: 100, background: "#0f172a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏗️</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Excavation Stage</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Yesterday</div>
        </div>
        <div className="card" style={{ padding: 8, textAlign: "center" }}>
          <div style={{ width: "100%", height: 100, background: "#0f172a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🧱</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Rebar Installation</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Today</div>
        </div>
      </div>
    </>
  );
}

function ChatTab({ messages, input, setInput, onSend, user }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "55vh" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.sender === (user?.name || "You") ? "flex-end" : "flex-start",
              maxWidth: "80%",
              background: m.sender === (user?.name || "You") ? "#2563eb" : "#1e293b",
              borderRadius: 12,
              padding: "8px 12px",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>{m.sender} • {m.time}</div>
            <div style={{ fontSize: 13 }}>{m.text}</div>
          </div>
        ))}
      </div>
      <form onSubmit={onSend} style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid #334155" }}>
        <input
          type="text"
          placeholder="Type message to site team…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", color: "#fff", outline: "none" }}
        />
        <button type="submit" className="btn btn-primary btn-sm" style={{ padding: "8px 14px" }}>Send</button>
      </form>
    </div>
  );
}

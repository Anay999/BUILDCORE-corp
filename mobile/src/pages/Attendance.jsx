import React, { useState, useEffect } from "react";
import { useApp, Ic } from "../context.jsx";
import { api, fmtDate, fmtTime } from "../api.js";

export default function AttendancePage() {
  const { showToast } = useApp();
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [today] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ user_id: "", date: today, status: "present", check_in: "", check_out: "", notes: "" });

  function load() {
    Promise.all([
      api.get(`/attendance?date=${today}`).catch(() => []),
      api.get("/users").catch(() => []),
    ]).then(([a, u]) => { setRecords(Array.isArray(a) ? a : []); setUsers(Array.isArray(u) ? u : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try { await api.post("/attendance", form); showToast("Attendance marked", "success"); setSheet(false); load(); }
    catch (err) { showToast(err.message, "error"); }
  }

  const present = records.filter(r => r.status === "present" || r.status === "late").length;
  const absent = records.filter(r => r.status === "absent").length;

  return (
    <>
      <div className="top-bar">
        <h1>Attendance</h1>
        <button className="top-bar-action" onClick={() => setSheet(true)}><Ic.Plus s={20} /></button>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, color: "#64748b", fontSize: 13 }}>
          <Ic.Calendar s={14} /> {fmtDate(today)} — Today
        </div>

        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi-card"><div className="kpi-val" style={{ color: "#10b981" }}>{present}</div><div className="kpi-lbl">Present</div></div>
          <div className="kpi-card"><div className="kpi-val" style={{ color: "#ef4444" }}>{absent}</div><div className="kpi-lbl">Absent</div></div>
          <div className="kpi-card"><div className="kpi-val">{records.filter(r => r.status === "late").length}</div><div className="kpi-lbl">Late</div></div>
          <div className="kpi-card"><div className="kpi-val">{records.length}</div><div className="kpi-lbl">Total</div></div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> :
          records.length === 0 ? (
            <div className="empty-state">
              <Ic.Users s={40} />
              <p>No attendance marked yet for today</p>
              <button className="btn btn-primary btn-sm" onClick={() => setSheet(true)}>Mark Attendance</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              {records.map((r, i) => {
                const statusColor = { present: "#10b981", absent: "#ef4444", late: "#f59e0b", leave: "#8b5cf6" }[r.status] || "#64748b";
                return (
                  <div key={r.id} className="list-item" style={{ padding: "12px 16px", borderBottom: i < records.length - 1 ? "1px solid #334155" : "none" }}>
                    <div className="avatar" style={{ fontSize: 13 }}>{(r.user_name || r.name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}</div>
                    <div className="list-item-body">
                      <div style={{ fontWeight: 700 }}>{r.user_name || r.name || `User #${r.user_id}`}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {r.check_in ? `In: ${fmtTime(r.check_in)}` : ""}
                        {r.check_out ? ` · Out: ${fmtTime(r.check_out)}` : ""}
                        {!r.check_in && !r.check_out && "—"}
                      </div>
                    </div>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                  </div>
                );
              })}
            </div>
          )
        }
        <div style={{ height: 8 }} />
      </div>

      {sheet && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header"><h2>Mark Attendance</h2><button className="btn btn-icon btn-secondary" onClick={() => setSheet(false)}><Ic.X /></button></div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sheet-body">
                <div className="field"><label>Employee *</label>
                  <select required value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
                    <option value="">Select employee…</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="field"><label>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="leave">Leave</option><option value="half_day">Half Day</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label>Check In</label><input type="time" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} /></div>
                  <div className="field"><label>Check Out</label><input type="time" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Notes</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional note" /></div>
              </div>
              <div className="sheet-footer"><button className="btn btn-primary btn-full" type="submit">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

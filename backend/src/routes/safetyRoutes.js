const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

pool.query(`
  CREATE TABLE IF NOT EXISTS safety_inspections (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    inspector_id INTEGER NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_status VARCHAR(20) DEFAULT 'pending',
    items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("safety table:", e.message));

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

router.get("/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT s.*, u.name as inspector_name FROM safety_inspections s
       JOIN users u ON s.inspector_id = u.id
       WHERE s.project_id = $1 ORDER BY s.created_at DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

router.post("/", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { project_id, inspector_id, items, notes, overall_status, date } = req.body;
    const r = await pool.query(
      `INSERT INTO safety_inspections (project_id, inspector_id, items, notes, overall_status, date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [project_id, inspector_id, JSON.stringify(items || []), notes || null, overall_status || "pending", date || new Date().toISOString().split("T")[0]]
    );
    const inspection = r.rows[0];

    // ── AUTO-CREATE ISSUE when safety inspection fails ───────────────────────
    // If the overall status is "fail" OR any individual item failed,
    // automatically raise a high-priority Safety issue so it doesn't get missed.
    const failedItems  = (items || []).filter(i => i.status === "fail" || i.status === "failed" || i.pass === false);
    const shouldRaise  = overall_status === "fail" || overall_status === "failed" || failedItems.length > 0;
    let issue_auto_created = false;

    if (shouldRaise && project_id) {
      try {
        const failSummary = failedItems.length > 0
          ? failedItems.map(i => i.label || i.name || i.item || "Item").join(", ")
          : "General inspection failure";
        const issueTitle = `Safety Inspection Failed — ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}`;
        const issueDesc  = `Auto-raised from safety inspection #${inspection.id}.\n\nFailed checks: ${failSummary}${notes ? "\n\nInspector notes: " + notes : ""}`;
        await pool.query(`
          INSERT INTO issues (project_id, reported_by, type, priority, title, description, status)
          VALUES ($1, $2, 'Safety', 'high', $3, $4, 'open')
        `, [project_id, inspector_id || u.id, issueTitle, issueDesc]);
        issue_auto_created = true;
      } catch (issErr) {
        console.log("safety→issue auto-create:", issErr.message);
      }

      // Notify all bosses/managers on this project
      try {
        const mgrs = await pool.query(
          `SELECT DISTINCT u.id FROM users u
           JOIN project_assignments pa ON pa.user_id = u.id
           WHERE pa.project_id = $1 AND u.role IN ('boss','manager')`, [project_id]
        );
        for (const mgr of mgrs.rows) {
          createNotification(mgr.id, "safety", "Safety Inspection Failed", `Project inspection on ${new Date().toLocaleDateString("en-IN")} marked as FAIL`, "projects", project_id);
        }
      } catch (_) {}
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({ ...inspection, issue_auto_created });
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query("DELETE FROM safety_inspections WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

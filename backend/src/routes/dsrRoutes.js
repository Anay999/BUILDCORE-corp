const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

pool.query(`
  CREATE TABLE IF NOT EXISTS site_reports (
    id                SERIAL PRIMARY KEY,
    project_id        INTEGER NOT NULL,
    report_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    prepared_by       INTEGER NOT NULL,
    weather           VARCHAR(100) DEFAULT 'Clear',
    temperature       VARCHAR(20),
    workers_present   INTEGER DEFAULT 0,
    work_done         TEXT,
    materials_used    TEXT,
    equipment_used    TEXT,
    issues            TEXT,
    safety_observations TEXT,
    visitors          TEXT,
    progress_pct      NUMERIC(5,2),
    photos            TEXT[],
    status            VARCHAR(20) DEFAULT 'draft',
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("site_reports table:", e.message));

// GET all DSRs for a project
router.get("/project/:projectId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT sr.*, u.name AS prepared_by_name
       FROM site_reports sr
       JOIN users u ON sr.prepared_by = u.id
       WHERE sr.project_id = $1
       ORDER BY sr.report_date DESC`,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// GET all DSRs (company-wide)
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT sr.*, u.name AS prepared_by_name, p.title AS project_title
       FROM site_reports sr
       JOIN users u ON sr.prepared_by = u.id
       LEFT JOIN projects p ON sr.project_id = p.id
       ORDER BY sr.report_date DESC LIMIT 100`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// GET single DSR
router.get("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT sr.*, u.name AS prepared_by_name, p.title AS project_title
       FROM site_reports sr
       JOIN users u ON sr.prepared_by = u.id
       LEFT JOIN projects p ON sr.project_id = p.id
       WHERE sr.id = $1`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// GET /:id/generate — print-ready HTML
router.get("/:id/generate", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT sr.*, u.name AS prepared_by_name, p.title AS project_title
       FROM site_reports sr
       JOIN users u ON sr.prepared_by = u.id
       LEFT JOIN projects p ON sr.project_id = p.id
       WHERE sr.id = $1`, [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
    const d = r.rows[0];
    const fmt = dt => dt ? new Date(dt).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" }) : "—";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Daily Site Report — ${d.project_title} — ${fmt(d.report_date)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; }
  .header { background: #f59e0b; color: #0f172a; padding: 24px 32px; border-radius: 12px; margin-bottom: 28px; }
  .header h1 { margin: 0 0 4px; font-size: 22px; }
  .header p { margin: 0; font-size: 13px; opacity: .8; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
  .card label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; display: block; margin-bottom: 4px; }
  .card span { font-size: 15px; font-weight: 700; }
  .section { margin-bottom: 20px; }
  .section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
  .section p { margin: 0; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
  .sig { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .sig-line { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; color: #64748b; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>Daily Site Report</h1>
  <p>${d.project_title || "—"} &nbsp;|&nbsp; ${fmt(d.report_date)}</p>
</div>
<div class="grid">
  <div class="card"><label>Prepared By</label><span>${d.prepared_by_name}</span></div>
  <div class="card"><label>Workers Present</label><span>${d.workers_present}</span></div>
  <div class="card"><label>Weather</label><span>${d.weather}${d.temperature ? " · " + d.temperature : ""}</span></div>
  ${d.progress_pct != null ? `<div class="card"><label>Progress</label><span>${d.progress_pct}%</span></div>` : ""}
  <div class="card"><label>Status</label><span style="text-transform:capitalize">${d.status}</span></div>
</div>
${d.work_done ? `<div class="section"><h3>Work Done Today</h3><p>${d.work_done}</p></div>` : ""}
${d.materials_used ? `<div class="section"><h3>Materials Used</h3><p>${d.materials_used}</p></div>` : ""}
${d.equipment_used ? `<div class="section"><h3>Equipment Used</h3><p>${d.equipment_used}</p></div>` : ""}
${d.issues ? `<div class="section"><h3>Issues / Delays</h3><p>${d.issues}</p></div>` : ""}
${d.safety_observations ? `<div class="section"><h3>Safety Observations</h3><p>${d.safety_observations}</p></div>` : ""}
${d.visitors ? `<div class="section"><h3>Visitors</h3><p>${d.visitors}</p></div>` : ""}
<div class="sig">
  <div><div class="sig-line">Site Engineer / Supervisor</div></div>
  <div><div class="sig-line">Project Manager</div></div>
</div>
</body></html>`;
    res.set("Content-Type","text/html").send(html);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// POST — create DSR
router.post("/", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const { project_id, report_date, weather, temperature, workers_present, work_done, materials_used, equipment_used, issues, safety_observations, visitors, progress_pct } = req.body;
  if (!project_id) return res.status(400).json({ message: "project_id required" });
  try {
    const r = await pool.query(
      `INSERT INTO site_reports (project_id, prepared_by, report_date, weather, temperature, workers_present, work_done, materials_used, equipment_used, issues, safety_observations, visitors, progress_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [project_id, user.id, report_date || new Date().toISOString().split("T")[0],
       weather || "Clear", temperature || null, workers_present || 0,
       work_done || null, materials_used || null, equipment_used || null,
       issues || null, safety_observations || null, visitors || null, progress_pct || null]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// PATCH — update DSR
router.patch("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const { weather, temperature, workers_present, work_done, materials_used, equipment_used, issues, safety_observations, visitors, progress_pct, status } = req.body;
  try {
    const r = await pool.query(
      `UPDATE site_reports SET weather=$1, temperature=$2, workers_present=$3, work_done=$4,
       materials_used=$5, equipment_used=$6, issues=$7, safety_observations=$8, visitors=$9,
       progress_pct=$10, status=$11, updated_at=NOW() WHERE id=$12 RETURNING *`,
      [weather, temperature, workers_present, work_done, materials_used, equipment_used,
       issues, safety_observations, visitors, progress_pct, status || "draft", req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { console.log(e.message); res.status(500).json({ message: "Server error" }); }
});

// DELETE
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM site_reports WHERE id=$1`, [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;

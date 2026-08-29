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
  CREATE TABLE IF NOT EXISTS contracts (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER,
    vendor_id       INTEGER,
    vendor_name     VARCHAR(200),
    title           VARCHAR(300) NOT NULL,
    scope           TEXT,
    contract_value  NUMERIC(14,2),
    payment_terms   TEXT,
    penalty_clause  TEXT,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(30) DEFAULT 'draft',
    created_by      VARCHAR(200),
    created_at      TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("contracts table:", e.message));

// GET all contracts
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT c.*, p.title AS project_title FROM contracts c
       LEFT JOIN projects p ON p.id=c.project_id
       ORDER BY c.created_at DESC`
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// GET single contract
router.get("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT c.*, p.title AS project_title FROM contracts c
       LEFT JOIN projects p ON p.id=c.project_id WHERE c.id=$1`, [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// GET generate printable HTML contract
router.get("/:id/generate", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const cr = await pool.query(
      `SELECT c.*, p.title AS project_title, p.client_name, p.location FROM contracts c
       LEFT JOIN projects p ON p.id=c.project_id WHERE c.id=$1`, [req.params.id]
    );
    if (!cr.rows.length) return res.status(404).send("<h1>Contract not found</h1>");
    const c = cr.rows[0];
    const fmt = n => "Rs." + Number(n||0).toLocaleString("en-IN");
    const fmtD = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"}) : "—";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Contract — ${c.title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Times New Roman',serif;font-size:13px;color:#1e293b;background:#fff;line-height:1.7}
  .page{padding:60px 72px;max-width:900px;margin:auto}
  h1{font-size:22px;font-weight:bold;text-align:center;margin-bottom:4px}
  h2{font-size:14px;font-weight:bold;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #94a3b8;padding-bottom:4px}
  p{margin-bottom:8px}
  .center{text-align:center}
  .meta-row{display:flex;justify-content:space-between;gap:40px;margin:16px 0}
  .meta-box{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px}
  .meta-box label{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;color:#64748b;display:block;margin-bottom:4px}
  .meta-box .val{font-size:14px;font-weight:bold;color:#0f172a}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;font-weight:bold;color:#475569}
  td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
  .sig-row{display:flex;gap:60px;margin-top:60px}
  .sig-box{flex:1;border-top:2px solid #0f172a;padding-top:10px;font-size:12px}
  .footer{margin-top:40px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}
</style>
</head>
<body>
<div class="page">
  <div class="no-print" style="margin-bottom:24px;text-align:right">
    <button onclick="window.print()" style="padding:9px 20px;background:#1e40af;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer">Print / Save PDF</button>
  </div>

  <div class="center" style="margin-bottom:24px">
    <div style="font-size:11px;font-weight:bold;color:#1e40af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">BUILDCORE CONSTRUCTION — OFFICIAL CONTRACT</div>
    <h1>${c.title}</h1>
    <div style="font-size:12px;color:#64748b;margin-top:6px">Contract No: CNTR-${String(c.id).padStart(4,"0")} &nbsp;·&nbsp; Generated: ${fmtD(new Date())}</div>
  </div>

  <div class="meta-row">
    <div class="meta-box"><label>Project</label><div class="val">${c.project_title||"—"}</div></div>
    <div class="meta-box"><label>Vendor / Contractor</label><div class="val">${c.vendor_name||"—"}</div></div>
    <div class="meta-box"><label>Contract Value</label><div class="val">${fmt(c.contract_value)}</div></div>
  </div>
  <div class="meta-row">
    <div class="meta-box"><label>Start Date</label><div class="val">${fmtD(c.start_date)}</div></div>
    <div class="meta-box"><label>End Date</label><div class="val">${fmtD(c.end_date)}</div></div>
    <div class="meta-box"><label>Status</label><div class="val" style="text-transform:capitalize">${c.status}</div></div>
  </div>

  <h2>1. Scope of Work</h2>
  <p>${(c.scope||"As agreed between the parties.").replace(/\n/g,"<br/>")}</p>

  <h2>2. Contract Value &amp; Payment Terms</h2>
  <p>The total contract value is <strong>${fmt(c.contract_value)}</strong>.</p>
  <p>${(c.payment_terms||"Payment terms to be mutually agreed.").replace(/\n/g,"<br/>")}</p>

  <h2>3. Duration</h2>
  <p>This contract is valid from <strong>${fmtD(c.start_date)}</strong> to <strong>${fmtD(c.end_date)}</strong>.</p>

  ${c.penalty_clause ? `<h2>4. Penalty Clause</h2><p>${c.penalty_clause.replace(/\n/g,"<br/>")}</p>` : ""}

  <h2>${c.penalty_clause?"5":"4"}. General Terms</h2>
  <p>1. The contractor shall carry out the work in accordance with applicable standards and safety regulations.</p>
  <p>2. Any changes to scope must be agreed in writing via a Change Order before work begins.</p>
  <p>3. The contractor is responsible for the quality of materials and workmanship unless otherwise specified.</p>
  <p>4. Disputes shall be resolved by mutual negotiation, failing which by arbitration under applicable law.</p>
  <p>5. This contract is governed by the laws of India.</p>

  <div class="sig-row">
    <div class="sig-box">
      <div><strong>Authorised Signatory</strong></div>
      <div style="margin-top:40px;font-size:12px;color:#64748b">Name &amp; Designation</div>
      <div style="margin-top:6px;font-size:12px;color:#64748b">Date: _______________</div>
      <div style="margin-top:6px;font-size:11px;color:#94a3b8">(BuildCore / Client)</div>
    </div>
    <div class="sig-box">
      <div><strong>${c.vendor_name||"Contractor"}</strong></div>
      <div style="margin-top:40px;font-size:12px;color:#64748b">Name &amp; Designation</div>
      <div style="margin-top:6px;font-size:12px;color:#64748b">Date: _______________</div>
      <div style="margin-top:6px;font-size:11px;color:#94a3b8">(Contractor / Vendor)</div>
    </div>
  </div>

  <div class="footer">
    BuildCore Construction Portal &nbsp;·&nbsp; Contract ID: CNTR-${String(c.id).padStart(4,"0")} &nbsp;·&nbsp; Generated ${new Date().toLocaleString("en-IN")}
  </div>
</div>
</body>
</html>`;

    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.send(html);
  } catch(e) { res.status(500).send(`<h1>Error</h1><pre>${e.message}</pre>`); }
});

// POST create contract
router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const user = getUser(req);
  const { project_id, vendor_id, vendor_name, title, scope, contract_value, payment_terms, penalty_clause, start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ message: "Title required" });
  try {
    const r = await pool.query(
      `INSERT INTO contracts (project_id,vendor_id,vendor_name,title,scope,contract_value,payment_terms,penalty_clause,start_date,end_date,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [project_id||null, vendor_id||null, vendor_name||"", title, scope||null,
       contract_value||null, payment_terms||null, penalty_clause||null,
       start_date||null, end_date||null, user?.name||"System"]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// PATCH update contract
router.patch("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const fields = ["title","scope","contract_value","payment_terms","penalty_clause","start_date","end_date","status","vendor_name","vendor_id","project_id"];
  const sets=[]; const vals=[];
  fields.forEach(f => { if (req.body[f]!==undefined) { sets.push(`${f}=$${vals.length+1}`); vals.push(req.body[f]); } });
  if (!sets.length) return res.json({});
  vals.push(req.params.id);
  try {
    const r = await pool.query(`UPDATE contracts SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// DELETE contract
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try { await pool.query(`DELETE FROM contracts WHERE id=$1`, [req.params.id]); res.json({ success: true }); }
  catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

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
  CREATE TABLE IF NOT EXISTS tenders (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER,
    title        VARCHAR(300) NOT NULL,
    description  TEXT,
    scope        TEXT,
    deadline     DATE,
    budget       NUMERIC(14,2),
    status       VARCHAR(30) DEFAULT 'open',
    created_by   VARCHAR(200),
    created_at   TIMESTAMP DEFAULT NOW()
  )
`).then(() => pool.query(`
  CREATE TABLE IF NOT EXISTS tender_bids (
    id            SERIAL PRIMARY KEY,
    tender_id     INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    vendor_id     INTEGER,
    vendor_name   VARCHAR(200) NOT NULL,
    amount        NUMERIC(14,2),
    delivery_days INTEGER,
    notes         TEXT,
    status        VARCHAR(30) DEFAULT 'submitted',
    submitted_at  TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("tender_bids table:", e.message))
).catch(e => console.log("tenders table:", e.message));

// GET all tenders
router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT t.*, p.title AS project_title,
              COUNT(b.id) AS bid_count
       FROM tenders t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN tender_bids b ON b.tender_id = t.id
       GROUP BY t.id, p.title
       ORDER BY t.created_at DESC`
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// GET single tender with bids
router.get("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const t = await pool.query(
      `SELECT t.*, p.title AS project_title FROM tenders t LEFT JOIN projects p ON p.id=t.project_id WHERE t.id=$1`,
      [req.params.id]
    );
    if (!t.rows.length) return res.status(404).json({ message: "Not found" });
    const bids = await pool.query(
      `SELECT * FROM tender_bids WHERE tender_id=$1 ORDER BY amount ASC`, [req.params.id]
    );
    res.json({ ...t.rows[0], bids: bids.rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST create tender
router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const user = getUser(req);
  const { project_id, title, description, scope, deadline, budget } = req.body;
  if (!title) return res.status(400).json({ message: "Title required" });
  try {
    const r = await pool.query(
      `INSERT INTO tenders (project_id,title,description,scope,deadline,budget,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id||null, title, description||null, scope||null, deadline||null, budget||null, user?.name||"System"]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// PATCH update tender
router.patch("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const fields = ["title","description","scope","deadline","budget","status","project_id"];
  const sets=[]; const vals=[];
  fields.forEach(f => { if (req.body[f]!==undefined) { sets.push(`${f}=$${vals.length+1}`); vals.push(req.body[f]); } });
  if (!sets.length) return res.json({});
  vals.push(req.params.id);
  try {
    const r = await pool.query(`UPDATE tenders SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// DELETE tender
router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try { await pool.query(`DELETE FROM tenders WHERE id=$1`, [req.params.id]); res.json({ success: true }); }
  catch(e) { res.status(500).json({ message: e.message }); }
});

// POST add bid to tender
router.post("/:id/bids", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const { vendor_id, vendor_name, amount, delivery_days, notes } = req.body;
  if (!vendor_name) return res.status(400).json({ message: "vendor_name required" });
  try {
    const r = await pool.query(
      `INSERT INTO tender_bids (tender_id,vendor_id,vendor_name,amount,delivery_days,notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, vendor_id||null, vendor_name, amount||null, delivery_days||null, notes||null]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// PATCH update a bid (shortlist / reject)
router.patch("/:id/bids/:bidId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const { status, amount, delivery_days, notes } = req.body;
  const fields=[]; const vals=[];
  if (status!==undefined) { fields.push(`status=$${vals.length+1}`); vals.push(status); }
  if (amount!==undefined) { fields.push(`amount=$${vals.length+1}`); vals.push(amount); }
  if (delivery_days!==undefined) { fields.push(`delivery_days=$${vals.length+1}`); vals.push(delivery_days); }
  if (notes!==undefined) { fields.push(`notes=$${vals.length+1}`); vals.push(notes); }
  if (!fields.length) return res.json({});
  vals.push(req.params.bidId);
  try {
    const r = await pool.query(`UPDATE tender_bids SET ${fields.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST award a bid — marks bid as awarded, others as rejected, tender as awarded
// Optionally auto-creates a PO
router.post("/:id/bids/:bidId/award", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const user = getUser(req);
  try {
    const bid = await pool.query(`SELECT * FROM tender_bids WHERE id=$1`, [req.params.bidId]);
    if (!bid.rows.length) return res.status(404).json({ message: "Bid not found" });
    const tender = await pool.query(`SELECT * FROM tenders WHERE id=$1`, [req.params.id]);

    // Award winning bid
    await pool.query(`UPDATE tender_bids SET status='awarded' WHERE id=$1`, [req.params.bidId]);
    // Reject all others
    await pool.query(`UPDATE tender_bids SET status='rejected' WHERE tender_id=$1 AND id!=$2`, [req.params.id, req.params.bidId]);
    // Close tender
    await pool.query(`UPDATE tenders SET status='awarded' WHERE id=$1`, [req.params.id]);

    // Auto-create PO
    let po = null;
    if (tender.rows[0]?.project_id && bid.rows[0].amount) {
      const poNum = `PO-TND-${Date.now().toString().slice(-6)}`;
      const poRes = await pool.query(
        `INSERT INTO purchase_orders (project_id,raised_by,po_number,vendor_name,description,category,amount,status)
         VALUES ($1,$2,$3,$4,$5,'Subcontractor',$6,'approved') RETURNING *`,
        [tender.rows[0].project_id, user?.name||"System", poNum, bid.rows[0].vendor_name,
         `Awarded from Tender: ${tender.rows[0].title}`, bid.rows[0].amount]
      ).catch(() => null);
      if (poRes) po = poRes.rows[0];
    }

    res.json({ success: true, bid: bid.rows[0], po });
  } catch(e) { console.log(e.message); res.status(500).json({ message: e.message }); }
});

// DELETE a bid
router.delete("/:id/bids/:bidId", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try { await pool.query(`DELETE FROM tender_bids WHERE id=$1`, [req.params.bidId]); res.json({ success: true }); }
  catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

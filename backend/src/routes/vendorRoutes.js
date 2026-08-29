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
  CREATE TABLE IF NOT EXISTS vendors (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    trade           VARCHAR(100),
    contact_name    VARCHAR(100),
    phone           VARCHAR(30),
    email           VARCHAR(150),
    address         TEXT,
    gst_number      VARCHAR(20),
    rating          NUMERIC(3,1) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active',
    payment_terms   VARCHAR(200),
    bank_details    TEXT,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("vendors table:", e.message));
pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(200)`).catch(()=>{});
pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_details TEXT`).catch(()=>{});

router.get("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try { const r = await pool.query(`SELECT * FROM vendors ORDER BY name`); res.json(r.rows); }
  catch(e) { res.json([]); }
});

router.get("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await pool.query(`SELECT * FROM vendors WHERE id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.get("/:id/pos", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const vendor = await pool.query(`SELECT name FROM vendors WHERE id=$1`, [req.params.id]);
    if (!vendor.rows.length) return res.status(404).json({ message: "Vendor not found" });
    const r = await pool.query(
      `SELECT po.*, p.title AS project_title FROM purchase_orders po
       LEFT JOIN projects p ON p.id = po.project_id
       WHERE LOWER(po.vendor_name) = LOWER($1) ORDER BY po.created_at DESC`,
      [vendor.rows[0].name]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.get("/:id/scorecard", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try {
    const vendor = await pool.query(`SELECT * FROM vendors WHERE id=$1`, [req.params.id]);
    if (!vendor.rows.length) return res.status(404).json({ message: "Not found" });
    const name = vendor.rows[0].name;

    const s = await pool.query(
      `SELECT COUNT(*) AS total_pos, COALESCE(SUM(amount),0) AS total_spend,
              COALESCE(AVG(amount),0) AS avg_po_value,
              COUNT(*) FILTER (WHERE status='received') AS received_pos,
              COUNT(*) FILTER (WHERE status='received' AND received_at IS NOT NULL AND expected_date IS NOT NULL AND received_at::date<=expected_date) AS on_time_pos,
              COUNT(*) FILTER (WHERE status='received' AND received_at IS NOT NULL AND expected_date IS NOT NULL) AS deliveries_with_dates,
              MAX(created_at) AS last_po_date
       FROM purchase_orders WHERE LOWER(vendor_name)=LOWER($1)`, [name]
    );
    const tw = await pool.query(
      `SELECT COUNT(*) AS won FROM tender_bids WHERE LOWER(vendor_name)=LOWER($1) AND status='awarded'`, [name]
    ).catch(() => ({ rows: [{ won: 0 }] }));

    const m = s.rows[0];
    const totalPOs = parseInt(m.total_pos)||0;
    const receivedPOs = parseInt(m.received_pos)||0;
    const onTimePOs = parseInt(m.on_time_pos)||0;
    const withDates = parseInt(m.deliveries_with_dates)||0;
    const deliveryRate = totalPOs > 0 ? Math.round((receivedPOs/totalPOs)*100) : null;
    const onTimeRate = withDates > 0 ? Math.round((onTimePOs/withDates)*100) : null;
    const ratingScore = (parseFloat(vendor.rows[0].rating)||0)/5*100;
    const parts = [ratingScore];
    if (deliveryRate !== null) parts.push(deliveryRate);
    if (onTimeRate !== null) parts.push(onTimeRate);
    const score = Math.round(parts.reduce((a,b)=>a+b,0)/parts.length);

    res.json({
      vendor: vendor.rows[0],
      metrics: { totalPOs, totalSpend: parseFloat(m.total_spend)||0, avgPOValue: parseFloat(m.avg_po_value)||0,
                 receivedPOs, deliveryRate, onTimeRate, lastPODate: m.last_po_date, tendersWon: parseInt(tw.rows[0]?.won)||0 },
      compositeScore: score,
      grade: score>=80?"A":score>=65?"B":score>=50?"C":"D",
    });
  } catch(e) { console.log(e.message); res.status(500).json({ message: e.message }); }
});

router.post("/", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const { name, trade, contact_name, phone, email, address, gst_number, rating, status, payment_terms, bank_details, notes } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO vendors (name,trade,contact_name,phone,email,address,gst_number,rating,status,payment_terms,bank_details,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, trade||"", contact_name||"", phone||"", email||"", address||"", gst_number||"",
       rating||0, status||"active", payment_terms||"", bank_details||"", notes||""]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.patch("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  const fields = ["name","trade","contact_name","phone","email","address","gst_number","rating","status","payment_terms","bank_details","notes"];
  const sets=[]; const vals=[];
  fields.forEach(f => { if (req.body[f]!==undefined) { sets.push(`${f}=$${vals.length+1}`); vals.push(req.body[f]); } });
  if (!sets.length) return res.json({});
  vals.push(req.params.id);
  try {
    const r = await pool.query(`UPDATE vendors SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.delete("/:id", async (req, res) => {
  if (!getUser(req)) return res.status(401).json({ message: "Unauthorized" });
  try { await pool.query(`DELETE FROM vendors WHERE id=$1`, [req.params.id]); res.json({ success: true }); }
  catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

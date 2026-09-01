const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");

const getUser = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey");
  } catch { return null; }
};

pool.query(`
  CREATE TABLE IF NOT EXISTS time_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    project_id  INTEGER NOT NULL,
    clock_in    TIMESTAMP NOT NULL DEFAULT NOW(),
    clock_out   TIMESTAMP,
    note        TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("time_logs:", e.message));

router.get("/", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { project_id, user_id } = req.query;
    const isBossOrManager = ["boss","manager"].includes(u.role);
    const whereUser = isBossOrManager ? (user_id ? `AND tl.user_id=${parseInt(user_id)}` : "") : `AND tl.user_id=${u.id}`;
    const whereProject = project_id ? `AND tl.project_id=${parseInt(project_id)}` : "";
    const r = await pool.query(`
      SELECT tl.*, u.name AS user_name, u.role AS user_role, p.title AS project_title
      FROM time_logs tl
      JOIN users u ON u.id = tl.user_id
      JOIN projects p ON p.id = tl.project_id
      WHERE 1=1 ${whereUser} ${whereProject}
      ORDER BY tl.clock_in DESC
      LIMIT 200
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/active", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  try {
    const r = await pool.query(
      `SELECT tl.*, p.title AS project_title FROM time_logs tl
       JOIN projects p ON p.id = tl.project_id
       WHERE tl.user_id=$1 AND tl.clock_out IS NULL ORDER BY tl.clock_in DESC LIMIT 1`,
      [u.id]
    );
    res.json(r.rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/clock-in", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  const { project_id, note } = req.body;
  if (!project_id) return res.status(400).json({ error: "project_id required" });
  try {
    await pool.query(`UPDATE time_logs SET clock_out=NOW() WHERE user_id=$1 AND clock_out IS NULL`, [u.id]);
    const now = new Date();
    const r = await pool.query(
      `INSERT INTO time_logs (user_id, project_id, note) VALUES ($1,$2,$3) RETURNING *`,
      [u.id, project_id, note || null]
    );
    try {
      const date = now.toISOString().split("T")[0];
      const h = now.getHours(), mn = now.getMinutes();
      const autoStatus = (h < 9 || (h === 9 && mn <= 30)) ? "present" : "late";
      await pool.query(
        `INSERT INTO attendance (project_id, user_id, date, status, clock_in)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (project_id, user_id, date) DO UPDATE
           SET clock_in = CASE WHEN attendance.clock_in IS NULL THEN $5 ELSE attendance.clock_in END,
               status   = CASE WHEN attendance.status  IS NULL THEN $4 ELSE attendance.status  END`,
        [project_id, u.id, date, autoStatus, now]
      );
    } catch (attErr) {
      console.log("attendance auto-mark:", attErr.message);
    }
    res.json({ ...r.rows[0], attendance_auto_marked: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/clock-out", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  try {
    const now = new Date();
    const r = await pool.query(
      `UPDATE time_logs SET clock_out=$2 WHERE user_id=$1 AND clock_out IS NULL RETURNING *`,
      [u.id, now]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "No active clock-in" });
    try {
      const date = now.toISOString().split("T")[0];
      await pool.query(
        `UPDATE attendance SET clock_out = $1
         WHERE project_id = $2 AND user_id = $3 AND date = $4 AND clock_out IS NULL`,
        [now, r.rows[0].project_id, u.id, date]
      );
    } catch (attErr) {
      console.log("attendance clock-out sync:", attErr.message);
    }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  const u = getUser(req);
  if (!u || !["boss","manager"].includes(u.role)) return res.status(403).json({ error: "Forbidden" });
  try {
    await pool.query(`DELETE FROM time_logs WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

/* ═══════════════════════════════════════════════════════
   TIMESHEET APPROVAL WORKFLOW
   Table: timesheets (weekly summaries submitted for approval)
═══════════════════════════════════════════════════════ */

pool.query(`
  CREATE TABLE IF NOT EXISTS timesheets (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL,
    project_id        INTEGER NOT NULL,
    week_start        DATE NOT NULL,
    total_hours       NUMERIC(8,2) DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'draft',
    note              TEXT,
    submitted_at      TIMESTAMP,
    reviewed_at       TIMESTAMP,
    reviewed_by       INTEGER,
    reviewer_name     TEXT,
    reviewer_comment  TEXT,
    created_at        TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, project_id, week_start)
  )
`).catch(e => console.log("timesheets:", e.message));

// GET /api/time-tracking/timesheets
// Workers see their own. Boss/manager see all (or filtered by project/user)
router.get("/timesheets", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { project_id, user_id, status } = req.query;
    const isMgr = ["boss","manager"].includes(u.role);
    const params = [];
    const whereParts = [];
    if (!isMgr) { params.push(u.id); whereParts.push(`t.user_id=$${params.length}`); }
    else if (user_id) { params.push(parseInt(user_id)); whereParts.push(`t.user_id=$${params.length}`); }
    if (project_id) { params.push(parseInt(project_id)); whereParts.push(`t.project_id=$${params.length}`); }
    if (status && ["draft","submitted","approved","rejected"].includes(status)) {
      params.push(status); whereParts.push(`t.status=$${params.length}`);
    }
    const where = whereParts.length ? "WHERE " + whereParts.join(" AND ") : "";
    const r = await pool.query(`
      SELECT t.*, u.name AS user_name, u.role AS user_role, p.title AS project_title
      FROM timesheets t
      JOIN users u ON u.id = t.user_id
      JOIN projects p ON p.id = t.project_id
      ${where}
      ORDER BY t.week_start DESC, t.submitted_at DESC NULLS LAST
      LIMIT 100
    `, params);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/time-tracking/timesheets — create or update a draft timesheet
router.post("/timesheets", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  const { project_id, week_start, note } = req.body;
  if (!project_id || !week_start) return res.status(400).json({ error: "project_id and week_start required" });
  try {
    // Calculate total hours from time_logs for this user/project/week
    const weekEnd = new Date(week_start); weekEnd.setDate(weekEnd.getDate() + 6);
    const hoursQ = await pool.query(`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(clock_out, NOW()) - clock_in))/3600), 0) AS hours
      FROM time_logs
      WHERE user_id=$1 AND project_id=$2 AND DATE(clock_in) BETWEEN $3 AND $4
    `, [u.id, project_id, week_start, weekEnd.toISOString().slice(0,10)]);
    const totalHours = parseFloat(hoursQ.rows[0].hours || 0).toFixed(2);

    const r = await pool.query(`
      INSERT INTO timesheets (user_id, project_id, week_start, total_hours, note, status)
      VALUES ($1, $2, $3, $4, $5, 'draft')
      ON CONFLICT (user_id, project_id, week_start) DO UPDATE
        SET total_hours = $4, note = COALESCE($5, timesheets.note), status = CASE WHEN timesheets.status = 'draft' THEN 'draft' ELSE timesheets.status END
      RETURNING *
    `, [u.id, project_id, week_start, totalHours, note || null]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/time-tracking/timesheets/:id/submit — worker submits for approval
router.patch("/timesheets/:id/submit", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  try {
    const r = await pool.query(`
      UPDATE timesheets SET status='submitted', submitted_at=NOW()
      WHERE id=$1 AND user_id=$2 AND status='draft'
      RETURNING *
    `, [req.params.id, u.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Timesheet not found or already submitted" });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/time-tracking/timesheets/:id/review — boss/manager approves or rejects
router.patch("/timesheets/:id/review", async (req, res) => {
  const u = getUser(req);
  if (!u || !["boss","manager"].includes(u.role)) return res.status(403).json({ error: "Forbidden" });
  const { status, comment } = req.body; // status: "approved" | "rejected"
  if (!["approved","rejected"].includes(status)) return res.status(400).json({ error: "status must be approved or rejected" });
  try {
    const r = await pool.query(`
      UPDATE timesheets
      SET status=$1, reviewed_at=NOW(), reviewed_by=$2, reviewer_name=$3, reviewer_comment=$4
      WHERE id=$5 AND status='submitted'
      RETURNING *
    `, [status, u.id, u.name, comment || null, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Timesheet not found or not in submitted state" });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Worker live GPS locations table
pool.query(`
  CREATE TABLE IF NOT EXISTS worker_locations (
    user_id     INTEGER PRIMARY KEY,
    project_id  INTEGER,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    speed       DOUBLE PRECISION,
    accuracy    DOUBLE PRECISION,
    heading     DOUBLE PRECISION,
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(e => console.log("worker_locations:", e.message));

// POST /api/time-tracking/location — update worker's live GPS position
router.post("/location", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  const { latitude, longitude, speed, accuracy, heading, project_id } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: "latitude and longitude are required" });
  }

  try {
    const r = await pool.query(`
      INSERT INTO worker_locations (user_id, project_id, latitude, longitude, speed, accuracy, heading, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET project_id = COALESCE($2, worker_locations.project_id),
            latitude   = $3,
            longitude  = $4,
            speed      = $5,
            accuracy   = $6,
            heading    = $7,
            updated_at = NOW()
      RETURNING *
    `, [u.id, project_id || null, latitude, longitude, speed || null, accuracy || null, heading || null]);

    const locData = {
      ...r.rows[0],
      user_name: u.name,
      user_role: u.role
    };

    const io = req.app.get("io");
    if (io) {
      io.emit("worker_location_update", locData);
      if (project_id) io.to(`project_${project_id}`).emit("worker_location_update", locData);
    }

    res.json({ ok: true, location: locData });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/time-tracking/live-workers — get all recently active worker positions
router.get("/live-workers", async (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { project_id } = req.query;
    let q = `
      SELECT wl.*, u.name AS user_name, u.role AS user_role, p.title AS project_title
      FROM worker_locations wl
      JOIN users u ON u.id = wl.user_id
      LEFT JOIN projects p ON p.id = wl.project_id
      WHERE wl.updated_at > NOW() - INTERVAL '1 hour'
    `;
    const params = [];
    if (project_id) {
      params.push(project_id);
      q += ` AND wl.project_id = $1`;
    }
    q += ` ORDER BY wl.updated_at DESC`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

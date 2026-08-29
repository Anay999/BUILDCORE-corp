const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

// middleware that accepts token from header OR query param (for OAuth redirect)
const verifyToken = (req, res, next) => {
  const token = req.headers["token"] || req.headers.authorization?.split(" ")[1] || req.query.token;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, "secretkey");
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ── Ensure integrations table exists ─────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    scope TEXT,
    email VARCHAR(255),
    connected_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider)
  )
`).catch(() => {});

// ── GET /api/integrations/status ──────────────────────────────────────────
router.get("/status", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT provider, email, connected_at FROM integrations WHERE user_id = $1",
      [req.user.id]
    );
    const status = {};
    rows.forEach(r => { status[r.provider] = { connected: true, email: r.email, since: r.connected_at }; });
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/integrations/google/connect ──────────────────────────────────
router.get("/google/connect", verifyToken, (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: "GOOGLE_CLIENT_ID not configured in .env" });

  const redirect = encodeURIComponent(`${process.env.APP_URL || "http://localhost:5000"}/api/integrations/google/callback`);
  const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar email profile");
  const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString("base64");

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`);
});

// ── GET /api/integrations/google/callback ─────────────────────────────────
router.get("/google/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`http://localhost:5173/?integration=error&provider=google&reason=${error}`);

  try {
    const { userId } = JSON.parse(Buffer.from(state, "base64").toString());
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL || "http://localhost:5000"}/api/integrations/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // Get user email
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await profileRes.json();

    // Check if this is a first-time connection (no existing row)
    const existing = await pool.query(
      "SELECT id FROM integrations WHERE user_id=$1 AND provider='google'",
      [userId]
    );
    const isFirstTime = existing.rows.length === 0;

    await pool.query(
      `INSERT INTO integrations (user_id, provider, access_token, refresh_token, scope, email)
       VALUES ($1, 'google', $2, $3, $4, $5)
       ON CONFLICT (user_id, provider) DO UPDATE SET access_token=$2, refresh_token=$3, scope=$4, email=$5, connected_at=NOW()`,
      [userId, tokens.access_token, tokens.refresh_token || null, tokens.scope || null, profile.email || null]
    );

    // Send welcome email on first-ever connection
    if (isFirstTime && profile.email) {
      try {
        const { sendGmailNotification, welcomeEmail } = require("../utils/gmailService");
        const userRow = await pool.query("SELECT name FROM users WHERE id=$1", [userId]);
        const userName = userRow.rows[0]?.name || "there";
        await sendGmailNotification(userId, "✅ Gmail Connected to BuildCore ERP", welcomeEmail(userName, profile.email), profile.email);
      } catch (mailErr) {
        console.warn("Welcome email failed (non-fatal):", mailErr.message);
      }
    }

    res.redirect(`http://localhost:5173/?integration=success&provider=google`);
  } catch (e) {
    res.redirect(`http://localhost:5173/?integration=error&provider=google&reason=${encodeURIComponent(e.message)}`);
  }
});

// ── GET /api/integrations/microsoft/connect ───────────────────────────────
router.get("/microsoft/connect", verifyToken, (req, res) => {
  const clientId = process.env.AZURE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: "AZURE_CLIENT_ID not configured in .env" });

  const redirect = encodeURIComponent(`${process.env.APP_URL || "http://localhost:5000"}/api/integrations/microsoft/callback`);
  const scope = encodeURIComponent("openid email profile offline_access Mail.Read Calendars.Read");
  const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString("base64");
  const tenant = process.env.AZURE_TENANT_ID || "common";

  res.redirect(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}&state=${state}&prompt=select_account`);
});

// ── GET /api/integrations/microsoft/callback ──────────────────────────────
router.get("/microsoft/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`http://localhost:5173/?integration=error&provider=microsoft&reason=${error}`);

  try {
    const { userId } = JSON.parse(Buffer.from(state, "base64").toString());
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenant = process.env.AZURE_TENANT_ID || "common";
    const redirectUri = `${process.env.APP_URL || "http://localhost:5000"}/api/integrations/microsoft/callback`;

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await profileRes.json();

    await pool.query(
      `INSERT INTO integrations (user_id, provider, access_token, refresh_token, scope, email)
       VALUES ($1, 'microsoft', $2, $3, $4, $5)
       ON CONFLICT (user_id, provider) DO UPDATE SET access_token=$2, refresh_token=$3, scope=$4, email=$5, connected_at=NOW()`,
      [userId, tokens.access_token, tokens.refresh_token || null, tokens.scope || null, profile.mail || profile.userPrincipalName || null]
    );

    res.redirect(`http://localhost:5173/?integration=success&provider=microsoft`);
  } catch (e) {
    res.redirect(`http://localhost:5173/?integration=error&provider=microsoft&reason=${encodeURIComponent(e.message)}`);
  }
});

// ── DELETE /api/integrations/:provider ────────────────────────────────────
router.delete("/:provider", verifyToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM integrations WHERE user_id=$1 AND provider=$2", [req.user.id, req.params.provider]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/integrations/send-test ──────────────────────────────────────
router.post("/send-test", verifyToken, async (req, res) => {
  try {
    const { sendGmailNotification, delayAlertEmail, deadlineEmail, budgetAlertEmail, welcomeEmail } = require("../utils/gmailService");
    const toEmail  = req.body?.toEmail  || null;
    const template = req.body?.template || "welcome";

    // Pick subject + body based on template
    let subject, html;
    const userRow = await pool.query("SELECT name FROM users WHERE id=$1", [req.user.id]);
    const userName = userRow.rows[0]?.name || "there";

    if (template === "delay") {
      subject = "⚠️ Project Delay Alert — BuildCore ERP";
      html    = delayAlertEmail("Sample Project", new Date(Date.now() + 3*24*3600*1000).toLocaleDateString(), 2);
    } else if (template === "deadline") {
      subject = "📅 Deadline Reminder — BuildCore ERP";
      html    = deadlineEmail("Sample Project", new Date(Date.now() + 3*24*3600*1000).toLocaleDateString(), 3);
    } else if (template === "budget") {
      subject = "💰 Budget Warning — BuildCore ERP";
      html    = budgetAlertEmail("Sample Project", 850000, 1000000, 85);
    } else if (template === "custom") {
      subject = "📬 Message from BuildCore ERP";
      html    = welcomeEmail(userName, toEmail || "you");
    } else {
      // welcome / default
      subject = "✅ BuildCore ERP — Gmail Connected Successfully!";
      html    = welcomeEmail(userName, toEmail || "you");
    }

    const result = await sendGmailNotification(req.user.id, subject, html,
      toEmail
    );
    res.json({ success: true, to: result.to });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/integrations/notify/delay ──────────────────────────────────
router.post("/notify/delay", verifyToken, async (req, res) => {
  try {
    const { sendGmailNotification, delayAlertEmail } = require("../utils/gmailService");
    const { projectName, deadline, daysLate, notifyUserIds } = req.body;

    // Notify all specified users who have Google connected
    const targets = notifyUserIds || [req.user.id];
    const results = [];
    for (const uid of targets) {
      try {
        await sendGmailNotification(uid, `⚠️ Delay Alert: ${projectName}`, delayAlertEmail(projectName, deadline, daysLate), toEmail);
        results.push({ uid, sent: true });
      } catch (e) {
        results.push({ uid, sent: false, error: e.message });
      }
    }
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/integrations/check-deadlines ─────────────────────────────────
// Call this on a schedule (or manually) to send deadline reminders
router.get("/check-deadlines", verifyToken, async (req, res) => {
  if (req.user.role !== "boss" && req.user.role !== "manager") return res.status(403).json({ error: "Unauthorized" });
  try {
    const { sendGmailNotification, deadlineEmail, delayAlertEmail } = require("../utils/gmailService");

    // Get projects with deadlines in next 7 days or already delayed
    const { rows: projects } = await pool.query(`
      SELECT p.id, p.title AS name, p.deadline, p.status,
             EXTRACT(DAY FROM (p.deadline::timestamp - NOW())) as days_left
      FROM projects p
      WHERE p.deadline IS NOT NULL
        AND p.status NOT IN ('completed', 'cancelled')
        AND p.deadline::timestamp > NOW() - INTERVAL '1 day'
        AND p.deadline::timestamp < NOW() + INTERVAL '8 days'
    `);

    // Get all boss/manager users with Google connected
    const { rows: admins } = await pool.query(`
      SELECT u.id FROM users u
      JOIN integrations i ON i.user_id = u.id AND i.provider = 'google'
      WHERE u.role IN ('boss', 'manager')
    `);

    const sent = [];
    for (const project of projects) {
      const daysLeft = Math.ceil(project.days_left);
      const isDelayed = project.status?.toLowerCase() === "delayed" || daysLeft < 0;
      const subject = isDelayed
        ? `⚠️ Delay Alert: ${project.name}`
        : `📅 Deadline in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}: ${project.name}`;
      const html = isDelayed
        ? delayAlertEmail(project.name, project.deadline, Math.abs(daysLeft))
        : deadlineEmail(project.name, project.deadline, daysLeft);

      for (const admin of admins) {
        try {
          await sendGmailNotification(admin.id, subject, html);
          sent.push({ project: project.name, uid: admin.id, daysLeft });
        } catch (e) { /* skip users whose tokens are invalid */ }
      }
    }
    res.json({ checked: projects.length, sent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports =router;


const pool = require("../config/db");

/**
 * Send an email via Gmail API using the user's stored OAuth token
 * @param {number} userId - BuildCore user ID
 * @param {string} subject
 * @param {string} htmlBody
 * @param {string} toEmail - defaults to the connected Gmail address
 */
async function sendGmailNotification(userId, subject, htmlBody, toEmail = null) {
  // Get stored token for this user
  const { rows } = await pool.query(
    "SELECT access_token, refresh_token, email FROM integrations WHERE user_id = $1 AND provider = 'google'",
    [userId]
  );

  if (!rows.length) throw new Error("No Google account connected for this user");

  const { access_token, refresh_token, email } = rows[0];
  const recipient = toEmail || email;
  if (!recipient) throw new Error("No recipient email found");

  // Try sending — if token expired, refresh first
  let token = access_token;
  let result = await trySend(token, recipient, subject, htmlBody);

  if (result.status === 401 && refresh_token) {
    token = await refreshAccessToken(userId, refresh_token);
    result = await trySend(token, recipient, subject, htmlBody);
  }

  if (!result.ok) {
    const err = await result.text();
    throw new Error(`Gmail API error: ${err}`);
  }

  return { success: true, to: recipient };
}

async function trySend(accessToken, to, subject, htmlBody) {
  const message = makeRFC2822(to, subject, htmlBody);
  const encoded = Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });
}

async function refreshAccessToken(userId, refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.access_token) {
    await pool.query("UPDATE integrations SET access_token=$1 WHERE user_id=$2 AND provider='google'", [data.access_token, userId]);
    return data.access_token;
  }
  // Log what Google actually returned so we can diagnose
  console.error("Google token refresh error:", JSON.stringify(data));
  if (data.error === "invalid_grant") {
    throw new Error("Gmail session expired — please reconnect your Google account in Settings → Integrations");
  }
  throw new Error(`Token refresh failed: ${data.error_description || data.error || "unknown"}`);
}

function encodeSubject(subject) {
  // RFC 2047 encoded-word for UTF-8 subjects — fixes emoji/unicode garbling in Gmail
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function makeRFC2822(to, subject, htmlBody) {
  return [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    htmlBody,
  ].join("\r\n");
}

// ── Email templates ────────────────────────────────────────────────────────
function delayAlertEmail(projectName, deadline, daysLate) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Inter',Arial,sans-serif;color:#e2e8f0">
<div style="max-width:600px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
  <div style="background:linear-gradient(135deg,#ef4444,#b91c1c);padding:28px 32px">
    <div style="font-size:28px;margin-bottom:6px">⚠️ Project Delay Alert</div>
    <div style="font-size:14px;opacity:0.9">BuildCore ERP — Automated Notification</div>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 20px">The following project has been marked as <strong style="color:#ef4444">Delayed</strong>:</p>
    <div style="background:#0f172a;border-radius:12px;padding:20px 24px;border-left:4px solid #ef4444;margin-bottom:24px">
      <div style="font-size:20px;font-weight:700;color:#f1f5f9;margin-bottom:8px">${projectName}</div>
      <div style="font-size:13px;color:#94a3b8">Original Deadline: <strong style="color:#fbbf24">${deadline}</strong></div>
      ${daysLate ? `<div style="font-size:13px;color:#94a3b8;margin-top:4px">Days overdue: <strong style="color:#ef4444">${daysLate}</strong></div>` : ""}
    </div>
    <p style="font-size:14px;color:#94a3b8;margin:0">Log in to BuildCore to review the project status and take corrective action.</p>
  </div>
  <div style="background:#0f172a;padding:16px 32px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,0.06)">
    BuildCore Construction ERP · This is an automated notification
  </div>
</div>
</body>
</html>`;
}

function deadlineEmail(projectName, deadline, daysLeft) {
  const urgency = daysLeft <= 1 ? "#ef4444" : daysLeft <= 3 ? "#f59e0b" : "#3b82f6";
  const label   = daysLeft === 0 ? "TODAY" : daysLeft === 1 ? "TOMORROW" : `${daysLeft} DAYS LEFT`;
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Inter',Arial,sans-serif;color:#e2e8f0">
<div style="max-width:600px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
  <div style="background:linear-gradient(135deg,${urgency},${urgency}cc);padding:28px 32px">
    <div style="font-size:28px;margin-bottom:6px">📅 Deadline Reminder</div>
    <div style="font-size:14px;opacity:0.9">BuildCore ERP — Automated Notification</div>
  </div>
  <div style="padding:32px">
    <div style="background:#0f172a;border-radius:12px;padding:20px 24px;border-left:4px solid ${urgency};margin-bottom:24px">
      <div style="font-size:20px;font-weight:700;color:#f1f5f9;margin-bottom:8px">${projectName}</div>
      <div style="font-size:13px;color:#94a3b8">Deadline: <strong style="color:#fbbf24">${deadline}</strong></div>
      <div style="display:inline-block;margin-top:10px;padding:4px 14px;background:${urgency}25;border:1px solid ${urgency}60;border-radius:99px;font-size:12px;font-weight:700;color:${urgency}">${label}</div>
    </div>
    <p style="font-size:14px;color:#94a3b8;margin:0">Log in to BuildCore to check the project progress.</p>
  </div>
  <div style="background:#0f172a;padding:16px 32px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,0.06)">
    BuildCore Construction ERP · This is an automated notification
  </div>
</div>
</body>
</html>`;
}

function budgetAlertEmail(projectName, used, total, pct) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Inter',Arial,sans-serif;color:#e2e8f0">
<div style="max-width:600px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
  <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px">
    <div style="font-size:28px;margin-bottom:6px">💰 Budget Warning</div>
    <div style="font-size:14px;opacity:0.9">BuildCore ERP — Automated Notification</div>
  </div>
  <div style="padding:32px">
    <div style="background:#0f172a;border-radius:12px;padding:20px 24px;border-left:4px solid #f59e0b;margin-bottom:24px">
      <div style="font-size:20px;font-weight:700;color:#f1f5f9;margin-bottom:12px">${projectName}</div>
      <div style="font-size:13px;color:#94a3b8;margin-bottom:8px">Budget Used: <strong style="color:#fbbf24">₹${used.toLocaleString()}</strong> of ₹${total.toLocaleString()}</div>
      <div style="background:#1e293b;border-radius:99px;height:8px;overflow:hidden;margin-top:8px">
        <div style="height:100%;width:${pct}%;background:${pct>=90?"#ef4444":"#f59e0b"};border-radius:99px"></div>
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:6px">${pct}% of budget consumed</div>
    </div>
    <p style="font-size:14px;color:#94a3b8;margin:0">Review the budget allocation in BuildCore before it exceeds the limit.</p>
  </div>
  <div style="background:#0f172a;padding:16px 32px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,0.06)">
    BuildCore Construction ERP · This is an automated notification
  </div>
</div>
</body>
</html>`;
}

function welcomeEmail(userName, connectedEmail) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Inter',Arial,sans-serif;color:#e2e8f0">
<div style="max-width:600px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:36px 32px;text-align:center">
    <div style="font-size:42px;margin-bottom:10px">🏗️</div>
    <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px">Welcome to BuildCore</div>
    <div style="font-size:14px;opacity:0.85">Your Gmail is now connected</div>
  </div>
  <!-- Body -->
  <div style="padding:36px 32px">
    <p style="font-size:16px;margin:0 0 8px;color:#f1f5f9">Hi <strong>${userName || "there"}</strong> 👋</p>
    <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:0 0 24px">
      You've successfully connected <strong style="color:#60a5fa">${connectedEmail}</strong> to BuildCore ERP.
      From now on, you'll automatically receive email alerts for the events that matter to your projects.
    </p>
    <!-- What to expect -->
    <div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px">You will be notified when</div>
      ${[
        ["🔴", "A project is marked as Delayed"],
        ["📅", "A project deadline is within 7, 3, or 1 day"],
        ["💰", "Budget utilisation exceeds 80%"],
      ].map(([icon, text]) => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="font-size:18px">${icon}</span>
        <span style="font-size:13px;color:#cbd5e1">${text}</span>
      </div>`).join("")}
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0">
        <span style="font-size:18px">⚙️</span>
        <span style="font-size:13px;color:#cbd5e1">More alerts can be configured in Settings → Integrations → Gmail Notifications</span>
      </div>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0">
      To change which alerts you receive, or to update the recipient address, go to
      <strong style="color:#94a3b8">Settings → Integrations → Gmail Notifications</strong>.
    </p>
  </div>
  <!-- Footer -->
  <div style="background:#0f172a;padding:16px 32px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center">
    <span>BuildCore Construction ERP</span>
    <span>This is an automated message — do not reply</span>
  </div>
</div>
</body>
</html>`;
}

module.exports = { sendGmailNotification, delayAlertEmail, deadlineEmail, budgetAlertEmail, welcomeEmail };

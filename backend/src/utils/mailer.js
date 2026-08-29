/**
 * Lightweight SMTP mailer using Node.js built-in tls module.
 * No npm packages needed. Supports Gmail with App Password.
 *
 * Setup in .env:
 *   MAIL_USER=your.gmail@gmail.com
 *   MAIL_PASS=your_app_password   (16-char Gmail App Password)
 *   MAIL_FROM=BuildCore <your.gmail@gmail.com>
 */

const tls  = require("tls");

const GMAIL_HOST = "smtp.gmail.com";
const GMAIL_PORT = 465;

const encode64 = (str) => Buffer.from(str).toString("base64");

const sendMail = ({ to, subject, html, text }) => {
  return new Promise((resolve, reject) => {
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;
    const from = process.env.MAIL_FROM || `BuildCore <${user}>`;

    if (!user || !pass) {
      console.log("⚠️  MAIL_USER / MAIL_PASS not set in .env — skipping email");
      return resolve({ skipped: true });
    }

    const boundary = `BP_${Date.now()}`;
    const body = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      text || subject,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      html || `<p>${text || subject}</p>`,
      ``,
      `--${boundary}--`,
    ].join("\r\n");

    const socket = tls.connect({ host: GMAIL_HOST, port: GMAIL_PORT }, () => {
      let step = 0;
      socket.on("data", (data) => {
        const msg = data.toString();
        if (step === 0 && msg.startsWith("220"))  { step++; socket.write(`EHLO localhost\r\n`); }
        else if (step === 1 && msg.includes("250")) { step++; socket.write(`AUTH LOGIN\r\n`); }
        else if (step === 2 && msg.startsWith("334")) { step++; socket.write(encode64(user) + "\r\n"); }
        else if (step === 3 && msg.startsWith("334")) { step++; socket.write(encode64(pass) + "\r\n"); }
        else if (step === 4 && msg.startsWith("235")) { step++; socket.write(`MAIL FROM:<${user}>\r\n`); }
        else if (step === 5 && msg.startsWith("250")) { step++; socket.write(`RCPT TO:<${to}>\r\n`); }
        else if (step === 6 && msg.startsWith("250")) { step++; socket.write(`DATA\r\n`); }
        else if (step === 7 && msg.startsWith("354")) { step++; socket.write(body + "\r\n.\r\n"); }
        else if (step === 8 && msg.startsWith("250")) { step++; socket.write(`QUIT\r\n`); socket.end(); resolve({ sent: true, to }); }
        else if (msg.startsWith("5")) { socket.destroy(); reject(new Error(`SMTP error: ${msg.trim()}`)); }
      });
    });
    socket.on("error", reject);
    socket.setTimeout(10000, () => { socket.destroy(); reject(new Error("SMTP timeout")); });
  });
};

// Pre-built templates
const templates = {
  taskAssigned: (to, taskTitle, projectName, assignerName) => sendMail({
    to,
    subject: `📋 New task assigned: ${taskTitle}`,
    html: `<div style="font-family:sans-serif;padding:20px;max-width:500px;">
      <h2 style="color:#f59e0b;">🏗️ BuildCore</h2>
      <p>Hi there,</p>
      <p><b>${assignerName}</b> has assigned you a new task:</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;border-left:4px solid #f59e0b;margin:16px 0;">
        <b style="font-size:16px;">${taskTitle}</b><br/>
        <span style="color:#64748b;">Project: ${projectName}</span>
      </div>
      <p>Log in to BuildCore to view and complete your task.</p>
      <p style="color:#94a3b8;font-size:12px;">— BuildCore Construction ERP</p>
    </div>`,
  }),

  deadlineWarning: (to, projectName, daysLeft, deadline) => sendMail({
    to,
    subject: `⚠️ Deadline in ${daysLeft} days: ${projectName}`,
    html: `<div style="font-family:sans-serif;padding:20px;max-width:500px;">
      <h2 style="color:#f59e0b;">🏗️ BuildCore</h2>
      <p>This is a deadline reminder for your project:</p>
      <div style="background:#fef3c7;padding:16px;border-radius:8px;border-left:4px solid #f59e0b;margin:16px 0;">
        <b style="font-size:16px;">${projectName}</b><br/>
        <span style="color:#92400e;">⏰ Due in <b>${daysLeft} days</b> — ${deadline}</span>
      </div>
      <p>Log in to BuildCore to check progress and ensure delivery on time.</p>
      <p style="color:#94a3b8;font-size:12px;">— BuildCore Construction ERP</p>
    </div>`,
  }),

  memberCreated: (to, name, email, password) => sendMail({
    to,
    subject: `🎉 Welcome to BuildCore, ${name}!`,
    html: `<div style="font-family:sans-serif;padding:20px;max-width:500px;">
      <h2 style="color:#f59e0b;">🏗️ BuildCore</h2>
      <p>Hi <b>${name}</b>,</p>
      <p>Your BuildCore account has been created. Here are your login credentials:</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
        <p style="margin:4px 0;"><b>Email:</b> ${email}</p>
        <p style="margin:4px 0;"><b>Password:</b> ${password}</p>
      </div>
      <p>Please log in and change your password immediately.</p>
      <p style="color:#94a3b8;font-size:12px;">— BuildCore Construction ERP</p>
    </div>`,
  }),
};

module.exports = { sendMail, templates };

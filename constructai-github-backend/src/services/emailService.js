const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', '..', 'sent_emails_log.json');

// Ensure SMTP configuration from env
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  // 1. Log locally
  let emails = [];
  try {
    if (fs.existsSync(logFilePath)) {
      emails = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('⚠️ Failed to read sent emails log:', e.message);
  }
  
  const emailLog = {
    id: Date.now(),
    to,
    subject,
    text,
    html,
    timestamp: new Date().toISOString()
  };
  emails.push(emailLog);
  
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(emails, null, 2), 'utf8');
  } catch (e) {
    console.error('⚠️ Failed to write sent emails log:', e.message);
  }

  // 2. Print to Console
  console.log('\n📧 ===================================================');
  console.log(`📧 NEW EMAIL SENT TO: ${to}`);
  console.log(`📧 SUBJECT: ${subject}`);
  console.log('📧 CONTENT SUMMARY:');
  console.log(text);
  console.log('📧 ===================================================\n');

  // 3. Send using Nodemailer if config exists
  if (smtpConfig.auth.user && smtpConfig.auth.pass) {
    try {
      const transporter = nodemailer.createTransport(smtpConfig);
      await transporter.sendMail({
        from: `ConstructAI Platform <${smtpConfig.auth.user}>`,
        to,
        subject,
        text,
        html
      });
      console.log(`✅ Email successfully sent to ${to} via SMTP.`);
    } catch (err) {
      console.error(`❌ SMTP mail dispatch failed to ${to}:`, err.message);
    }
  } else {
    // Attempt Ethereal SMTP auto-test account creation if no user config is provided
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      const info = await transporter.sendMail({
        from: '"ConstructAI System" <noreply@constructai.com>',
        to,
        subject,
        text,
        html
      });
      console.log(`📝 Ethereal Test Mail sent! URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (etherealErr) {
      console.log('ℹ️ SMTP credentials not configured. Local verification only.');
    }
  }
};

const sendWorkerAllocationEmail = async ({ email, fullName, password, projectName, projectLocation }) => {
  const subject = `ConstructAI — Invitation to Project "${projectName}"`;
  const text = `
Hello ${fullName},

You are invited to join the construction project: "${projectName}".

Project Invitation Details:
- Project Name: ${projectName}
- Project Address / Location: ${projectLocation || 'Sector 5'}

Login Details (ConstructAI Mobile App):
- Login ID / Gmail: ${email}
- Password: ${password || 'Use your existing account password'}

Please download and log in to the ConstructAI mobile engineering app using these credentials to begin your tasks.

Best regards,
ConstructAI Operations Team
`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h2 style="color: #6366f1; margin-top: 0; text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">ConstructAI Project Invitation</h2>
      <p style="font-size: 15px; color: #374151;">Hello <strong>${fullName}</strong>,</p>
      <p style="font-size: 15px; color: #374151;">You have been invited to join the following construction project team:</p>
      
      <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; padding: 15px; margin: 15px 0;">
        <p style="margin: 4px 0; font-size: 14px;"><strong>Project Name:</strong> ${projectName}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Project Address / Location:</strong> ${projectLocation || 'Sector 5'}</p>
      </div>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">Login Details (Mobile App):</h4>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Login ID (Gmail):</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${email}</code></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${password || 'Use your existing account password'}</code></p>
      </div>

      <p style="font-size: 14px; color: #4b5563;">Use these credentials to log in to the ConstructAI mobile app and start managing your tasks and uploads.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">This is an automated system email from the ConstructAI Operations Team.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
};

module.exports = {
  sendWorkerAllocationEmail,
  sendEmail
};

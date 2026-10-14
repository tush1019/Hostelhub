const nodemailer = require("nodemailer");

/* ============================================================
   Email delivery has two paths:
   1) EmailJS HTTPS API (port 443) — used when
      EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID / EMAILJS_PUBLIC_KEY
      are set. Works on networks where SMTP ports are blocked.
      
   2) Gmail SMTP (port 587/465) — fallback when EmailJS is not
      configured (e.g. on a hosting server that allows SMTP).
   Returns clear errors so the server boots without crashing.
   ============================================================ */

function isEmailJsConfigured() {
  return Boolean(
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_PUBLIC_KEY
  );
}

function isSmtpConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);
}

function isEmailConfigured() {
  return isEmailJsConfigured() || isSmtpConfigured();
}

/* ---------- EmailJS (HTTPS API) ---------- */
async function sendViaEmailJs({ to, subject, text, html, toName }) {
  const body = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: to,
      email: to,
      to: to,
      user_email: to,
      receiver_email: to,
      to_name: toName || to,
      subject,
      message: text,
      content: html,
      reply_to: process.env.EMAIL_FROM || process.env.EMAIL_USER || to,
    },
  };
  // Optional account-level access token (recommended by EmailJS for servers)
  if (process.env.EMAILJS_ACCESS_TOKEN) {
    body.accessToken = process.env.EMAILJS_ACCESS_TOKEN;
  }

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(
      `EmailJS rejected the request (${res.status}): ${detail}`
    );
    err.code = "EMAILJS_SEND_FAILED";
    throw err;
  }
}

/* ---------- Gmail SMTP (fallback) ---------- */
function getTransporter() {
  if (!isSmtpConfigured()) return null;

  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

/* Sends the 6-digit verification code with a clean HostelHub template. */
async function sendOtpEmail(to, code, name) {
  if (!isEmailConfigured()) {
    const err = new Error(
      "Email is not configured. Set EmailJS keys (EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY) or EMAIL_USER + EMAIL_APP_PASSWORD in backend/.env"
    );
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  const safeName = name || "there";
  const subject = `Your HostelHub verification code: ${code}`;
  const text =
    `Hi ${safeName},\n\n` +
    `Your HostelHub email verification code is: ${code}\n\n` +
    `It expires in 5 minutes. If you did not request this, you can ignore this email.\n\n` +
    `— HostelHub Team`;
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">` +
    `<h2 style="color:#4f46e5;margin:0 0 8px">HostelHub</h2>` +
    `<p style="color:#334155">Hi ${safeName},</p>` +
    `<p style="color:#334155">Your email verification code is:</p>` +
    `<div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1e293b;background:#f1f5f9;padding:14px 10px;text-align:center;border-radius:10px;margin:16px 0">${code}</div>` +
    `<p style="color:#64748b;font-size:13px">It expires in <strong>5 minutes</strong>. If you did not request this, you can safely ignore this email.</p>` +
    `<p style="color:#94a3b8;font-size:12px">— HostelHub Team</p>` +
    `</div>`;

  // 1) Prefer EmailJS HTTPS API (works when SMTP ports are blocked)
  if (isEmailJsConfigured()) {
    await sendViaEmailJs({ to, toName: safeName, subject, text, html });
    return;
  }

  // 2) Fallback: direct Gmail SMTP
  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error("Email is not configured.");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  await transporter.sendMail({
    from: `"HostelHub" <${from}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  isEmailConfigured,
  isEmailJsConfigured,
  isSmtpConfigured,
  getTransporter,
  sendOtpEmail,
};


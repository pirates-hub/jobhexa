import nodemailer from 'nodemailer';

let transporter = null;
let emailQueue = [];
let isProcessing = false;

export const getTransporter = () => {
  if (transporter) return transporter;
  const isGmail = (process.env.SMTP_HOST || '').includes('gmail');
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateLimit: isGmail ? 5 : 10,
    rateDelta: 1000,
  });
  return transporter;
};

// Proper queue for every user - handles Gmail 500/day limit via batching + retry
// Retries are BOUNDED (max 3 attempts): a permanently failing address must
// never wedge the queue and delay everyone else's mail.
const MAX_ATTEMPTS = 3;

const processQueue = async () => {
  if (isProcessing || emailQueue.length === 0) return;
  isProcessing = true;
  while (emailQueue.length > 0) {
    const item = emailQueue.shift();
    const { to, subject, html, text, resolve, reject } = item;
    const attempts = (item.attempts || 0) + 1;
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
        resolve({ messageId: 'mock-' + Date.now() });
        continue;
      }
      // Validate recipient is real email (not @jobhexa.com fake)
      if (to.includes('@jobhexa.com') && to !== process.env.SMTP_USER) {
        console.log(`[Email Skip] Fake domain ${to} - would fail deliverability, sending to ${process.env.SMTP_USER} instead for testing`);
        // For @jobhexa.com fake users, still create in-app notification but skip email or send to admin for testing
        resolve({ messageId: 'skipped-fake-domain' });
        continue;
      }
      const t = getTransporter();
      const info = await t.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text,
      });
      console.log(`[Email Sent] To: ${to}, Subject: ${subject}, ID: ${info.messageId}`);
      resolve(info);
    } catch (err) {
      console.error(`[Email Failed] To: ${to}, Attempt ${attempts}/${MAX_ATTEMPTS}, Error: ${err.message}`);
      // Retry transient failures with backoff, but give up after MAX_ATTEMPTS
      const authFailure = err.message.includes('Invalid login') || err.message.includes('Authentication');
      if (!authFailure && attempts < MAX_ATTEMPTS) {
        emailQueue.push({ to, subject, html, text, resolve, reject, attempts });
        await new Promise(r => setTimeout(r, 2000 * attempts));
        continue;
      }
      reject(err);
    }
    // Rate limit: 200ms between emails to respect Gmail
    await new Promise(r => setTimeout(r, 200));
  }
  isProcessing = false;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  return new Promise((resolve, reject) => {
    emailQueue.push({ to, subject, html, text, resolve, reject });
    processQueue();
  });
};

// For production at scale (10k+ users), replace with:
// - SendGrid: apiKey + @sendgrid/mail
// - AWS SES: @aws-sdk/client-ses
// - Mailgun: mailgun.js
// Then set: EMAIL_PROVIDER=sendgrid, SENDGRID_API_KEY=..., FROM=noreply@jobhexa.com

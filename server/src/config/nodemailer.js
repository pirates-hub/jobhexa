import nodemailer from 'nodemailer';
import dns from 'node:dns';

// Render hosts have no IPv6 route, but smtp.gmail.com resolves IPv6-first,
// producing `connect ENETUNREACH <ipv6>:587` on every send. Prefer IPv4.
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

let transporter = null;
let emailQueue = [];
let isProcessing = false;
let warnedBrevo = false;
// Set when SMTP fails, so the rest of the queue goes straight to Brevo for
// 10 minutes instead of paying a 20s connect timeout per message.
let smtpDisabledUntil = 0;

// Sender header: always show "JobHexa" in the inbox, not the raw Gmail name.
// Gmail allows a display name on the authenticated account, so a plain
// SMTP_FROM address is wrapped once — an already-formatted value is left alone.
export const buildFromHeader = () => {
  const address = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  if (!address) return '"JobHexa" <no-reply@localhost>';
  if (address.includes('<')) return address;
  return `"JobHexa" <${address}>`;
};

export const getTransporter = () => {
  if (transporter) return transporter;
  const isGmail = (process.env.SMTP_HOST || '').includes('gmail');
  // Gmail only signs mail for the authenticated account. A custom-domain From
  // (noreply@jobhexa.com) is rewritten by Google and lands in Spam — warn once.
  const from = process.env.SMTP_FROM || '';
  const fromDomain = from.includes('@') ? from.split('@').pop().toLowerCase() : '';
  const userDomain = (process.env.SMTP_USER || '').split('@').pop().toLowerCase();
  if (isGmail && fromDomain && fromDomain !== 'gmail.com' && fromDomain !== userDomain) {
    console.warn(`[Email] SMTP_FROM=${from} does not match the Gmail account (${process.env.SMTP_USER}). Google rewrites this sender and often spam-files it — set SMTP_FROM=${process.env.SMTP_USER}.`);
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Timeouts: without these a blackholed SMTP connection hangs forever,
    // wedging the queue so every later mail silently never sends.
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
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
      const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
      const brevoKey = (process.env.BREVO_API_KEY || '').trim();
      const hasBrevo = Boolean(brevoKey);

      if (!hasSmtp && !hasBrevo) {
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

      // Provider order. SMTP first by default: it sends as the Gmail account
      // itself (SPF/DKIM aligned) and reaches the inbox, while Brevo's shared
      // relay is often spam-foldered. Override with EMAIL_PROVIDER=smtp|brevo.
      // A provider that just failed is skipped for 10 minutes so a blocked
      // port doesn't add a 20s timeout to every message in the queue.
      const prefer = (process.env.EMAIL_PROVIDER || '').toLowerCase();
      const order = prefer === 'brevo' ? ['brevo', 'smtp'] : ['smtp', 'brevo'];
      const smtpUsable = hasSmtp && Date.now() > smtpDisabledUntil;

      if (!warnedBrevo) {
        warnedBrevo = true;
        console.log(`[Email] Provider: ${smtpUsable ? 'SMTP (Gmail)' : 'Brevo API'} first${smtpUsable && hasBrevo ? ', Brevo fallback' : ''}`);
        if (hasSmtp) console.log(`[Email] From: ${buildFromHeader()}`);
        if (hasBrevo && !brevoKey.startsWith('xkeysib-')) {
          console.warn('[Email] BREVO_API_KEY does not start with "xkeysib-". SMTP keys (xsmtpsib-…) are not valid for the HTTPS API and return 401 Key not found.');
        }
      }

      let delivered = false;
      let lastErr = null;

      for (const provider of order) {
        if (provider === 'smtp' && !smtpUsable) continue;
        if (provider === 'brevo' && !hasBrevo) continue;

        try {
          if (provider === 'smtp') {
            const t = getTransporter();
            const info = await t.sendMail({
              from: buildFromHeader(),
              to,
              subject,
              html,
              text,
            });
            console.log(`[Email Sent via SMTP] To: ${to}, Subject: ${subject}, ID: ${info.messageId}`);
            resolve(info);
          } else {
            const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_SENDER || process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
            const senderName = (process.env.BREVO_SENDER_NAME || 'JobHexa').trim();
            if (!senderEmail) {
              throw new Error('No Brevo sender email. Set BREVO_SENDER_EMAIL to an address verified in Brevo.');
            }
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 25000);
            let data;
            try {
              const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', accept: 'application/json' },
                body: JSON.stringify({
                  sender: { email: senderEmail, name: senderName },
                  to: [{ email: to }],
                  subject,
                  htmlContent: html || undefined,
                  textContent: text || undefined,
                }),
                signal: ctrl.signal,
              });
              if (!resp.ok) {
                const body = (await resp.text()).slice(0, 300);
                const hint = resp.status === 401 || resp.status === 403
                  ? ' — BREVO_API_KEY must be the v3 API key (xkeysib-…), not the SMTP key (xsmtpsib-…)'
                  : resp.status === 400 && /sender/i.test(body)
                    ? ` — "${senderEmail}" is not a verified sender in Brevo (Senders & IPs → Senders)`
                    : '';
                throw new Error(`Brevo rejected (${resp.status}): ${body}${hint}`);
              }
              data = await resp.json();
            } finally { clearTimeout(timer); }
            console.log(`[Email Sent via Brevo] To: ${to}, Subject: ${subject}, ID: ${data.messageId} (sender: ${senderName} <${senderEmail}>)`);
            resolve({ messageId: data.messageId || `brevo-${Date.now()}` });
          }
          delivered = true;
          break;
        } catch (providerErr) {
          lastErr = providerErr;
          if (provider === 'smtp') {
            smtpDisabledUntil = Date.now() + 10 * 60 * 1000;
            console.error(`[Email] SMTP failed for ${to}: ${providerErr.message}`);
          } else {
            console.error(`[Email] Brevo failed for ${to}: ${providerErr.message}`);
          }
          const nextProvider = provider === 'smtp' ? 'Brevo' : 'SMTP';
          const canFallback = provider === 'smtp' ? hasBrevo : hasSmtp;
          if (canFallback) console.log(`[Email] Falling back to ${nextProvider} for this message`);
        }
      }

      if (!delivered) throw lastErr || new Error('All email providers failed');
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

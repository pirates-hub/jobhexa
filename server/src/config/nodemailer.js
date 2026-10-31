import nodemailer from 'nodemailer';
import dns from 'node:dns';
import net from 'node:net';
import MailAttempt from '../models/MailAttempt.js';

// Diagnostics: a failed insert must never affect delivery.
const recordAttempt = (provider, ok, { messageId, error, to, subject } = {}) => {
  const toDomain = String(to || '').split('@').pop().slice(0, 60) || undefined;
  MailAttempt.create({
    provider,
    ok,
    messageId: messageId ? String(messageId).slice(0, 200) : undefined,
    error: ok ? undefined : String(error || '').replace(/[\w.+-]+@[\w.-]+/g, '<address>').slice(0, 200),
    toDomain,
    subject: String(subject || '').slice(0, 160) || undefined,
  }).catch(() => {});
};

// nodemailer resolves with c-ares and then picks a RANDOM address from the
// combined IPv4+IPv6 list (lib/shared/index.js), so dns.setDefaultResultOrder
// has no effect and Render — which has no IPv6 route — kept dialling
// `2404:...:587` and failing with ENETUNREACH before falling back to Brevo.
// We therefore resolve IPv4 ourselves and hand nodemailer the literal address,
// keeping the hostname as the TLS servername so SNI and cert checks still work.
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

let transporter = null;
let transporterPromise = null;
let transporterPort = 0;
let preferredPort = 0;
let emailQueue = [];
let isProcessing = false;
let warnedBrevo = false;
// Set when SMTP fails, so the rest of the queue goes straight to Brevo for
// 10 minutes instead of paying a connect timeout per message.
let smtpDisabledUntil = 0;

// Render blocks outbound SMTP on some ports: 587 now resolves to IPv4 but the
// TCP connect times out. 465 (implicit TLS) is commonly open. Try both before
// handing the message to Brevo.
const smtpPorts = () => {
  const configured = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  const ports = [configured];
  if (process.env.SMTP_PORT_FALLBACK !== 'false') {
    const alt = configured === 465 ? 587 : 465;
    if (!ports.includes(alt)) ports.push(alt);
  }
  // Whatever worked last goes first, so later mails don't re-test a dead port.
  return preferredPort ? [preferredPort, ...ports.filter((p) => p !== preferredPort)] : ports;
};

// Reset after a failure so the next attempt re-resolves DNS and re-tests ports
// instead of pinning a dead address until the next deploy.
const resetTransporter = () => {
  transporter = null;
  transporterPromise = null;
  transporterPort = 0;
};

// A protocol-level rejection (bad password, refused recipient) fails on every
// port, so it is not worth opening a second connection to find that out.
const isConnectionError = (err) => !(err && (err.responseCode || err.code === 'EAUTH' || err.code === 'EENVELOPE'));

// Sender header: always show "JobHexa" in the inbox, not the raw Gmail name.
// Gmail allows a display name on the authenticated account, so a plain
// SMTP_FROM address is wrapped once — an already-formatted value is left alone.
export const buildFromHeader = () => {
  const address = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  if (!address) return '"JobHexa" <no-reply@localhost>';
  if (address.includes('<')) return address;
  return `"JobHexa" <${address}>`;
};

export const getTransporter = (port) => {
  const target = port || parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  if (transporter && transporterPort === target) return Promise.resolve(transporter);
  if (transporterPromise && transporterPort === target) return transporterPromise;
  transporter = null;
  transporterPort = target;
  transporterPromise = createTransporter(target).then((t) => {
    transporter = t;
    return t;
  }).catch((err) => {
    if (transporterPort === target) transporterPromise = null;
    throw err;
  });
  return transporterPromise;
};

export const sendViaSmtp = async (message) => {
  let lastErr;
  for (const port of smtpPorts()) {
    try {
      const t = await getTransporter(port);
      const info = await t.sendMail({ from: buildFromHeader(), ...message });
      preferredPort = port;
      return info;
    } catch (err) {
      lastErr = err;
      resetTransporter();
      if (!isConnectionError(err)) throw err;
      console.error(`[Email] SMTP port ${port} failed: ${err.message}`);
    }
  }
  throw lastErr || new Error('SMTP send failed');
};

export const verifySmtp = async () => {
  let lastErr;
  for (const port of smtpPorts()) {
    try {
      const t = await getTransporter(port);
      await t.verify();
      preferredPort = port;
      return port;
    } catch (err) {
      lastErr = err;
      resetTransporter();
      if (!isConnectionError(err)) throw err;
    }
  }
  throw lastErr || new Error('SMTP verify failed');
};

const createTransporter = async (port) => {
  const isGmail = (process.env.SMTP_HOST || '').includes('gmail');
  // Gmail only signs mail for the authenticated account. A custom-domain From
  // (noreply@jobhexa.com) is rewritten by Google and lands in Spam — warn once.
  const from = process.env.SMTP_FROM || '';
  const fromDomain = from.includes('@') ? from.split('@').pop().toLowerCase() : '';
  const userDomain = (process.env.SMTP_USER || '').split('@').pop().toLowerCase();
  if (isGmail && fromDomain && fromDomain !== 'gmail.com' && fromDomain !== userDomain) {
    console.warn(`[Email] SMTP_FROM=${from} does not match the Gmail account (${process.env.SMTP_USER}). Google rewrites this sender and often spam-files it — set SMTP_FROM=${process.env.SMTP_USER}.`);
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  let connectHost = host;
  if (!net.isIP(host)) {
    try {
      const ipv4 = await dns.promises.lookup(host, { family: 4 });
      connectHost = ipv4.address;
      console.log(`[Email] ${host} -> ${connectHost} (IPv4, avoids Render's missing IPv6 route)`);
    } catch (err) {
      console.warn(`[Email] IPv4 lookup failed for ${host}: ${err.message} — connecting by hostname`);
    }
  }
  const servername = net.isIP(connectHost) ? host : undefined;

  return nodemailer.createTransport({
    host: connectHost,
    servername,
    tls: servername ? { servername } : undefined,
    port,
    // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Timeouts: without these a blackholed SMTP connection hangs forever,
    // wedging the queue so every later mail silently never sends.
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateLimit: isGmail ? 5 : 10,
    rateDelta: 1000,
  });
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
    const { to, subject, html, text, headers, resolve, reject } = item;
    const attempts = (item.attempts || 0) + 1;
    try {
      const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
      const brevoKey = (process.env.BREVO_API_KEY || '').trim();
      const hasBrevo = Boolean(brevoKey);
      const sendgridKey = (process.env.SENDGRID_API_KEY || '').trim();
      const hasSendgrid = Boolean(sendgridKey);

      if (!hasSmtp && !hasBrevo && !hasSendgrid) {
        const messageId = 'mock-' + Date.now();
        console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
        recordAttempt('mock', true, { messageId, to, subject });
        resolve({ messageId });
        continue;
      }
      // Validate recipient is real email (not @jobhexa.com fake)
      if (to.includes('@jobhexa.com') && to !== process.env.SMTP_USER) {
        console.log(`[Email Skip] Fake domain ${to} - would fail deliverability, sending to ${process.env.SMTP_USER} instead for testing`);
        // For @jobhexa.com fake users, still create in-app notification but skip email or send to admin for testing
        resolve({ messageId: 'skipped-fake-domain' });
        continue;
      }

      // Provider order. HTTPS APIs (port 443) come first because Render blocks
      // outbound SMTP: 587 and 465 both time out, so SMTP can never deliver
      // there. Brevo is last — its account was paused by compliance on
      // 28 Oct and it accepts mail without sending it.
      // Override with EMAIL_PROVIDER=sendgrid|smtp|brevo.
      const prefer = (process.env.EMAIL_PROVIDER || '').toLowerCase();
      const defaults = ['sendgrid', 'smtp', 'brevo'];
      const order = prefer ? [prefer, ...defaults.filter((p) => p !== prefer)] : defaults;
      const smtpUsable = hasSmtp && Date.now() > smtpDisabledUntil;

      if (!warnedBrevo) {
        warnedBrevo = true;
        const active = order.filter((p) =>
          (p === 'smtp' && smtpUsable) || (p === 'brevo' && hasBrevo) || (p === 'sendgrid' && hasSendgrid)
        );
        console.log(`[Email] Providers in order: ${active.join(' -> ') || '(none configured)'}`);
        console.log(`[Email] From: ${buildFromHeader()}`);
        if (hasBrevo && !brevoKey.startsWith('xkeysib-')) {
          console.warn('[Email] BREVO_API_KEY does not start with "xkeysib-". SMTP keys (xsmtpsib-…) are not valid for the HTTPS API and return 401 Key not found.');
        }
      }

      let delivered = false;
      let lastErr = null;

      for (const provider of order) {
        if (provider === 'smtp' && !smtpUsable) continue;
        if (provider === 'brevo' && !hasBrevo) continue;
        if (provider === 'sendgrid' && !hasSendgrid) continue;

        try {
          if (provider === 'sendgrid') {
            const senderEmail = (process.env.SENDGRID_FROM || process.env.EMAIL_SENDER || process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
            const senderName = (process.env.SENDGRID_SENDER_NAME || 'JobHexa').trim();
            if (!senderEmail) {
              throw new Error('No SendGrid sender email. Set SENDGRID_FROM to a verified Single Sender address.');
            }
            const content = [];
            if (text) content.push({ type: 'text/plain', value: text });
            if (html) content.push({ type: 'text/html', value: html });
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 25000);
            let messageId;
            try {
              const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  personalizations: [{ to: [{ email: to }] }],
                  from: { email: senderEmail, name: senderName },
                  subject,
                  content: content.length ? content : [{ type: 'text/plain', value: subject }],
                }),
                signal: ctrl.signal,
              });
              if (!resp.ok) {
                const body = (await resp.text()).slice(0, 300);
                const hint = resp.status === 401
                  ? ' — SENDGRID_API_KEY is invalid or revoked'
                  : resp.status === 403 && /sender/i.test(body)
                    ? ` — "${senderEmail}" is not a verified Single Sender in SendGrid`
                    : '';
                throw new Error(`SendGrid rejected (${resp.status}): ${body}${hint}`);
              }
              messageId = resp.headers.get('x-message-id') || `sendgrid-${Date.now()}`;
            } finally { clearTimeout(timer); }
            console.log(`[Email Sent via SendGrid] To: ${to}, Subject: ${subject}, ID: ${messageId} (sender: ${senderName} <${senderEmail}>)`);
            recordAttempt('sendgrid', true, { messageId, to, subject });
            resolve({ messageId });
          } else if (provider === 'smtp') {
            const info = await sendViaSmtp({ to, subject, html, text, headers });
            console.log(`[Email Sent via SMTP] To: ${to}, Subject: ${subject}, ID: ${info.messageId}`);
            recordAttempt('smtp', true, { messageId: info.messageId, to, subject });
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
                  ...(headers && Object.keys(headers).length ? { headers } : {}),
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
            recordAttempt('brevo', true, { messageId: data.messageId, to, subject });
            resolve({ messageId: data.messageId || `brevo-${Date.now()}` });
          }
          delivered = true;
          break;
        } catch (providerErr) {
          lastErr = providerErr;
          recordAttempt(provider, false, { error: providerErr.message, to, subject });
          if (provider === 'smtp') {
            smtpDisabledUntil = Date.now() + 10 * 60 * 1000;
            resetTransporter();
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
        emailQueue.push({ to, subject, html, text, headers, resolve, reject, attempts });
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

export const sendEmail = async ({ to, subject, html, text, headers }) => {
  return new Promise((resolve, reject) => {
    emailQueue.push({ to, subject, html, text, headers, resolve, reject });
    processQueue();
  });
};

// For production at scale (10k+ users), replace with:
// - SendGrid: apiKey + @sendgrid/mail
// - AWS SES: @aws-sdk/client-ses
// - Mailgun: mailgun.js
// Then set: EMAIL_PROVIDER=sendgrid, SENDGRID_API_KEY=..., FROM=noreply@jobhexa.com

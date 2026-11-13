import dns from 'node:dns';
import MailAttempt from '../../models/MailAttempt.js';
import {
  brevoSender,
  isDryRun,
  isPaused,
  mailjetSender,
  providerChain,
  replyTo,
  resendSender,
  sendgridSender,
  senderFor,
  addressOf,
} from './config.js';

// Prefer IPv4 for the optional local SMTP transport. Render has no IPv6 route,
// and nodemailer otherwise picks a random address from the DNS answer.
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

class MailProviderError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'MailProviderError';
    this.statusCode = statusCode;
  }
}

const RETRY_DELAYS_MS = [700, 1800];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error) => {
  if (!error?.statusCode) return true; // network, DNS, timeout
  return error.statusCode === 429 || error.statusCode >= 500;
};

const errorText = (error) => String(error?.message || error || 'unknown error')
  .replace(/[\w.+-]+@[\w.-]+/g, '<address>')
  .slice(0, 500);

const toDomain = (to) => String(to || '').split('@')[1] || '';

const recordAttempt = async ({ provider, ok, flow, messageId, error, statusCode, attempt, to, subject, userId }) => {
  try {
    await MailAttempt.create({
      provider,
      ok,
      flow,
      messageId,
      error: error ? errorText(error) : undefined,
      statusCode,
      attempt,
      toDomain: toDomain(to),
      subject,
      userId,
    });
  } catch (e) {
    // Logging must never break a send.
    console.error('[Mail] attempt log failed:', e.message);
  }
};

const postJson = async (url, headers, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { res, data };
};

export const sendViaResend = async ({ to, subject, html, text, headers }) => {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) throw new MailProviderError('RESEND_API_KEY is missing');
  const from = resendSender();
  if (!addressOf(from)) throw new MailProviderError('RESEND_FROM is empty');

  const body = {
    from,
    to: [to],
    subject,
    html,
    text,
    ...(headers && Object.keys(headers).length ? { headers } : {}),
    ...(replyTo() ? { reply_to: replyTo() } : {}),
  };

  const { res, data } = await postJson('https://api.resend.com/emails', {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }, body);

  if (!res.ok) {
    const hint = res.status === 401
      ? ' — RESEND_API_KEY is invalid or revoked'
      : res.status === 403
        ? ` — "${addressOf(from)}" is not allowed. Verify jobhexa.com in Resend, or use onboarding@resend.dev for a test to the account owner`
        : res.status === 422
          ? ' — Resend rejected the from/to/subject fields'
          : res.status === 429
            ? ' — Resend rate limit reached'
            : '';
    throw new MailProviderError(
      `Resend ${res.status}: ${data.message || data.name || 'request failed'}${hint}`,
      res.status
    );
  }

  return { provider: 'resend', messageId: data.id || `resend-${Date.now()}` };
};

export const sendViaSendgrid = async ({ to, subject, html, text, headers }) => {
  const key = (process.env.SENDGRID_API_KEY || '').trim();
  if (!key) throw new MailProviderError('SENDGRID_API_KEY is missing');
  const from = sendgridSender();
  if (!addressOf(from)) throw new MailProviderError('SENDGRID_FROM is empty');

  const content = [];
  if (text) content.push({ type: 'text/plain', value: text });
  if (html) content.push({ type: 'text/html', value: html });

  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: addressOf(from), name: (from.match(/^"([^"]+)"/) || [])[1] || 'JobHexa' },
    subject,
    content: content.length ? content : [{ type: 'text/plain', value: subject }],
    ...(headers && Object.keys(headers).length ? { headers } : {}),
    ...(replyTo() ? { reply_to: { email: replyTo() } } : {}),
  };

  const { res, data } = await postJson('https://api.sendgrid.com/v3/mail/send', {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }, body);

  if (!res.ok) {
    const raw = typeof data === 'object' && data.raw ? data.raw : JSON.stringify(data);
    const hint = res.status === 401
      ? ' — SENDGRID_API_KEY is invalid or revoked'
      : res.status === 403 && /sender/i.test(raw)
        ? ` — "${addressOf(from)}" is not a verified Single Sender in SendGrid`
        : '';
    throw new MailProviderError(`SendGrid ${res.status}: ${raw.slice(0, 300)}${hint}`, res.status);
  }

  return { provider: 'sendgrid', messageId: res.headers.get('x-message-id') || `sendgrid-${Date.now()}` };
};

const displayName = (from) => (from.match(/^"([^"]+)"/) || [])[1] || 'JobHexa';

export const sendViaMailjet = async ({ to, subject, html, text, headers }) => {
  const key = (process.env.MAILJET_API_KEY || '').trim();
  const secret = (process.env.MAILJET_API_SECRET || '').trim();
  if (!key || !secret) throw new MailProviderError('MAILJET_API_KEY/MAILJET_API_SECRET are missing');
  const from = mailjetSender();
  if (!addressOf(from)) throw new MailProviderError('MAILJET_FROM is empty');

  const message = {
    From: { Email: addressOf(from), Name: displayName(from) },
    To: [{ Email: to }],
    Subject: subject,
    ...(text ? { TextPart: text } : {}),
    ...(html ? { HTMLPart: html } : {}),
    ...(headers && Object.keys(headers).length ? { Headers: headers } : {}),
    ...(replyTo() ? { ReplyTo: { Email: replyTo() } } : {}),
  };

  const { res, data } = await postJson('https://api.mailjet.com/v3.1/send', {
    Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
    'Content-Type': 'application/json',
  }, { Messages: [message] });

  if (!res.ok) {
    const raw = data?.ErrorMessage || data?.message || (typeof data === 'string' ? data : JSON.stringify(data));
    const hint = res.status === 401
      ? ' — MAILJET_API_KEY/MAILJET_API_SECRET are invalid'
      : res.status === 400 && /sender/i.test(String(raw))
        ? ` — "${addressOf(from)}" is not a validated sender in Mailjet`
        : res.status === 429
          ? ' — Mailjet rate limit reached'
          : '';
    throw new MailProviderError(`Mailjet ${res.status}: ${String(raw).slice(0, 300)}${hint}`, res.status);
  }

  const result = Array.isArray(data?.Messages) ? data.Messages[0] : null;
  if (result?.Status && result.Status !== 'success') {
    const errors = (result.Errors || []).map((entry) => entry.ErrorMessage).filter(Boolean).join('; ')
      || result.Status;
    throw new MailProviderError(`Mailjet rejected: ${errors}`, 400);
  }

  const messageId = result?.To?.[0]?.MessageUUID
    || result?.To?.[0]?.MessageID
    || `mailjet-${Date.now()}`;
  return { provider: 'mailjet', messageId: String(messageId) };
};

export const sendViaBrevo = async ({ to, subject, html, text, headers }) => {
  const key = (process.env.BREVO_API_KEY || '').trim();
  if (!key) throw new MailProviderError('BREVO_API_KEY is missing');
  const from = brevoSender();
  if (!addressOf(from)) throw new MailProviderError('BREVO_SENDER_EMAIL is empty');

  const body = {
    sender: {
      email: addressOf(from),
      name: (from.match(/^"([^"]+)"/) || [])[1] || 'JobHexa',
    },
    to: [{ email: to }],
    subject,
    htmlContent: html || undefined,
    textContent: text || undefined,
    ...(headers && Object.keys(headers).length ? { headers } : {}),
    ...(replyTo() ? { replyTo: { email: replyTo() } } : {}),
  };

  const { res, data } = await postJson('https://api.brevo.com/v3/smtp/email', {
    'api-key': key,
    accept: 'application/json',
    'Content-Type': 'application/json',
  }, body);

  if (!res.ok) {
    throw new MailProviderError(
      `Brevo ${res.status}: ${data.message || data.code || 'request failed'}`,
      res.status
    );
  }

  return { provider: 'brevo', messageId: data.messageId || `brevo-${Date.now()}` };
};

// Local development only. Render blocks outbound SMTP, so this provider is
// omitted unless EMAIL_PROVIDER=smtp or ALLOW_SMTP=true.
export const sendViaSmtp = async ({ to, subject, html, text, headers }) => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new MailProviderError('SMTP_USER/SMTP_PASS are missing');
  }

  const address = await new Promise((resolve) => {
    dns.lookup(host, { family: 4 }, (err, found) => resolve(err ? null : found));
  });

  const nodemailer = (await import('nodemailer')).default;
  const transport = nodemailer.createTransport({
    host: address || host,
    port,
    secure: port === 465,
    tls: { servername: host },
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  try {
    const info = await transport.sendMail({
      from: senderFor('smtp'),
      to,
      subject,
      html,
      text,
      headers,
    });
    return { provider: 'smtp', messageId: info.messageId || `smtp-${Date.now()}` };
  } finally {
    transport.close();
  }
};

const SENDERS = {
  resend: sendViaResend,
  sendgrid: sendViaSendgrid,
  mailjet: sendViaMailjet,
  brevo: sendViaBrevo,
  smtp: sendViaSmtp,
};

// Try each configured provider, retrying only transient failures. A 401/403/422
// is not retried on the same provider, but the next provider may still work.
export const sendWithProviders = async ({ to, subject, html, text, headers = {}, flow, userId }) => {
  if (isPaused()) throw new Error('Mail is paused (MAIL_PAUSED=true)');
  if (isDryRun()) {
    await recordAttempt({ provider: 'mock', ok: true, flow, messageId: 'dry-run', attempt: 1, to, subject, userId });
    return { provider: 'mock', messageId: `dry-run-${Date.now()}`, dryRun: true };
  }

  const chain = providerChain();
  if (!chain.length) {
    throw new Error('No mail provider configured. Set RESEND_API_KEY (recommended), SENDGRID_API_KEY, MAILJET_API_KEY + MAILJET_API_SECRET, or BREVO_API_KEY with BREVO_ENABLED=true.');
  }

  const failures = [];
  for (const provider of chain) {
    for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt++) {
      try {
        const result = await SENDERS[provider]({ to, subject, html, text, headers });
        await recordAttempt({
          provider, ok: true, flow, messageId: result.messageId,
          attempt, to, subject, userId,
        });
        if (attempt > 1) console.log(`[Mail] ${provider} succeeded on attempt ${attempt}`);
        return { ...result, attempts: attempt };
      } catch (error) {
        const statusCode = error?.statusCode;
        await recordAttempt({
          provider, ok: false, flow, error, statusCode,
          attempt, to, subject, userId,
        });
        failures.push(`${provider} attempt ${attempt}: ${errorText(error)}`);
        console.error(`[Mail] ${provider} attempt ${attempt} failed for ${toDomain(to)}: ${errorText(error)}`);

        if (!isRetryable(error) || attempt > RETRY_DELAYS_MS.length) break;
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
      }
    }
  }

  throw new Error(`All mail providers failed — ${failures.join(' | ')}`);
};

export { MailProviderError };

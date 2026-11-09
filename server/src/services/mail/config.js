// Environment and address helpers for the mail system. Kept free of imports so
// provider, template and flow modules can all depend on it without cycles.

const base = (value, fallback) => (value || fallback).replace(/\/+$/, '');

export const appBase = () => base(process.env.FRONTEND_URL, 'http://localhost:5173');
export const apiBase = () => base(process.env.BACKEND_URL, process.env.FRONTEND_URL || 'http://localhost:5000');

const truthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

export const isDryRun = () => truthy(process.env.MAIL_DRY_RUN);
export const isPaused = () => truthy(process.env.MAIL_PAUSED);
export const sendDelayMs = () => {
  const n = Number(process.env.MAIL_SEND_DELAY_MS);
  return Number.isFinite(n) && n >= 0 ? n : 350;
};

export const addressOf = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
};

export const withName = (email, name = 'JobHexa') => {
  const value = String(email || '').trim();
  if (!value) return '';
  return value.includes('<') ? value : `"${name}" <${value}>`;
};

export const resendSender = () =>
  withName(addressOf(process.env.RESEND_FROM || process.env.EMAIL_FROM) || 'onboarding@resend.dev');

export const sendgridSender = () => withName(
  addressOf(process.env.SENDGRID_FROM || process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER),
  process.env.SENDGRID_SENDER_NAME || 'JobHexa'
);

export const brevoSender = () => withName(
  addressOf(process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER),
  process.env.BREVO_SENDER_NAME || 'JobHexa'
);

export const senderFor = (provider) => {
  if (provider === 'resend') return resendSender();
  if (provider === 'sendgrid') return sendgridSender();
  if (provider === 'brevo') return brevoSender();
  if (provider === 'smtp') return withName(addressOf(process.env.SMTP_FROM || process.env.SMTP_USER));
  return '';
};

export const replyTo = () => addressOf(process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO);

export const providerConfigured = {
  resend: () => Boolean((process.env.RESEND_API_KEY || '').trim()),
  sendgrid: () => Boolean((process.env.SENDGRID_API_KEY || '').trim()),
  // Brevo is off unless explicitly enabled: the account was paused on 28 Oct
  // and its API accepts mail without delivering it, which hides failures.
  brevo: () => Boolean((process.env.BREVO_API_KEY || '').trim())
    && (truthy(process.env.BREVO_ENABLED) || (process.env.EMAIL_PROVIDER || '').toLowerCase() === 'brevo'),
  // Render blocks outbound SMTP. SMTP is for local development only and must
  // be opted into, otherwise every send pays a 15s connection timeout.
  smtp: () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
    && (truthy(process.env.ALLOW_SMTP) || (process.env.EMAIL_PROVIDER || '').toLowerCase() === 'smtp'),
};

export const PROVIDER_ORDER = ['resend', 'sendgrid', 'brevo', 'smtp'];

export const providerChain = () => {
  const preferred = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const order = preferred && PROVIDER_ORDER.includes(preferred)
    ? [preferred, ...PROVIDER_ORDER.filter((p) => p !== preferred)]
    : PROVIDER_ORDER;
  return order.filter((p) => providerConfigured[p]());
};

export const describeProviders = () => PROVIDER_ORDER.map((provider) => ({
  provider,
  configured: providerConfigured[provider](),
  from: senderFor(provider) || null,
}));

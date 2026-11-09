import crypto from 'node:crypto';
import MailDelivery from '../../models/MailDelivery.js';
import MailAttempt from '../../models/MailAttempt.js';
import {
  addressOf,
  apiBase,
  appBase,
  describeProviders,
  isDryRun,
  isPaused,
  providerChain,
  sendDelayMs,
  senderFor,
} from './config.js';
import { sendWithProviders } from './providers.js';

// One serial queue for every outbound mail. Providers rate-limit per second,
// and the old code had several paths (cron, admin, auth) that could race each
// other. A single queue keeps ordering and gives us one place to add delay.
let queueTail = Promise.resolve();
let queued = 0;
let lastSendAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const truthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

// jobhexa.com currently has no MX record. Sending there always bounces and
// damages the provider reputation, so it is rejected unless explicitly enabled.
export const isSendableAddress = (raw) => {
  const email = addressOf(raw);
  if (!EMAIL_RE.test(email)) return false;
  if (/@jobhexa\.com$/i.test(email) && !truthy(process.env.MAIL_ALLOW_INTERNAL)) return false;
  return true;
};

const toDomain = (to) => String(addressOf(to)).split('@')[1] || '';

const errorText = (error) => String(error?.message || error || 'unknown error').slice(0, 500);

const enqueue = (job) => {
  queued += 1;
  const run = queueTail.then(async () => {
    try {
      const wait = Math.max(0, sendDelayMs() - (Date.now() - lastSendAt));
      if (wait) await sleep(wait);
      return await job();
    } finally {
      queued -= 1;
      lastSendAt = Date.now();
    }
  });
  queueTail = run.catch(() => {});
  return run;
};

export const getQueueInfo = () => ({ pending: queued, delayMs: sendDelayMs() });

/**
 * Send one message through the provider chain. Used by transactional mail,
 * admin test/manual sends and the flow helper below.
 */
export const sendMail = async ({
  to,
  subject,
  html,
  text,
  headers = {},
  flow = 'admin_manual',
  userId,
}) => {
  if (isPaused()) throw new Error('Mail is paused (MAIL_PAUSED=true)');
  if (!subject) throw new Error('Mail subject is required');
  if (!isSendableAddress(to)) {
    throw new Error(`Recipient is missing or not deliverable: ${toDomain(to) || 'no domain'}`);
  }

  return enqueue(() => sendWithProviders({
    to: addressOf(to),
    subject,
    html,
    text,
    headers,
    flow,
    userId,
  }));
};

const STALE_SENDING_MS = () => {
  const n = Number(process.env.MAIL_STALE_SENDING_MS);
  return Number.isFinite(n) && n > 0 ? n : 10 * 60 * 1000;
};

const MAX_FLOW_ATTEMPTS = () => {
  const n = Number(process.env.MAIL_MAX_ATTEMPTS);
  return Number.isFinite(n) && n > 0 ? n : 4;
};

// Atomically claim the (user, flow, periodKey) row. A crash between "claimed"
// and "sent" leaves status=sending; after STALE_SENDING_MS another run may
// reclaim it, so a deploy mid-send cannot lose the email forever.
const claimDelivery = async ({ user, flow, periodKey }) => {
  const key = { user: user._id, flow, periodKey };
  const maxAttempts = MAX_FLOW_ATTEMPTS();

  for (let i = 0; i < 4; i += 1) {
    const existing = await MailDelivery.findOne(key);

    if (!existing) {
      try {
        const delivery = await MailDelivery.create({
          ...key,
          status: 'sending',
          attempts: 1,
          toDomain: toDomain(user.email),
        });
        return { delivery };
      } catch (error) {
        if (error?.code === 11000) continue; // another worker won the race
        throw error;
      }
    }

    if (existing.status === 'sent') {
      return { skip: 'already_sent', delivery: existing };
    }

    const age = Date.now() - new Date(existing.updatedAt || existing.createdAt || Date.now()).getTime();
    if (existing.status === 'sending' && age < STALE_SENDING_MS()) {
      return { skip: 'in_progress', delivery: existing };
    }

    if (existing.status === 'failed' && (existing.attempts || 0) >= maxAttempts) {
      return { skip: 'max_attempts', delivery: existing };
    }

    const claimed = await MailDelivery.findOneAndUpdate(
      { _id: existing._id, status: existing.status, attempts: existing.attempts || 0 },
      { $set: { status: 'sending', lastError: null }, $inc: { attempts: 1 } },
      { new: true }
    );
    if (claimed) return { delivery: claimed };
  }

  return { skip: 'busy' };
};

const markSent = async (delivery, result) => {
  await MailDelivery.updateOne(
    { _id: delivery._id },
    {
      $set: {
        status: 'sent',
        provider: result.provider,
        messageId: result.messageId,
        sentAt: new Date(),
        lastError: null,
      },
    }
  ).catch((e) => console.error('[Mail] delivery update failed:', e.message));
};

const markFailed = async (delivery, error) => {
  await MailDelivery.updateOne(
    { _id: delivery._id },
    { $set: { status: 'failed', lastError: errorText(error) } }
  ).catch((e) => console.error('[Mail] failure update failed:', e.message));
};

/**
 * Send a recurring/flow email exactly once per (user, flow, periodKey).
 * Returns { skipped } when the period was already sent or is in progress.
 * Throws on a delivery failure after recording it so callers can count it.
 */
export const sendFlowMail = async ({
  user,
  flow,
  periodKey,
  template,
  headers = {},
  retryFailed = true,
}) => {
  if (!user?._id) throw new Error('sendFlowMail requires a user with _id');
  if (!flow || !periodKey) throw new Error('sendFlowMail requires flow and periodKey');
  if (!isSendableAddress(user.email)) {
    return { ok: true, skipped: true, reason: 'no_deliverable_email' };
  }
  if (!retryFailed) {
    const previous = await MailDelivery.findOne({ user: user._id, flow, periodKey });
    if (previous && previous.status !== 'sent') {
      return { ok: true, skipped: true, reason: 'previous_failure' };
    }
  }

  let content;
  try {
    content = template();
  } catch (error) {
    throw new Error(`Template failed for ${flow}: ${error.message}`);
  }

  const claim = await claimDelivery({ user, flow, periodKey });
  if (claim.skip) {
    return { ok: true, skipped: true, reason: claim.skip, delivery: claim.delivery };
  }

  try {
    const result = await sendMail({
      to: user.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
      headers: { ...headers, ...(content.headers || {}) },
      flow,
      userId: user._id,
    });
    await markSent(claim.delivery, result);
    return {
      ok: true,
      skipped: false,
      provider: result.provider,
      messageId: result.messageId,
      deliveryId: claim.delivery._id,
    };
  } catch (error) {
    await markFailed(claim.delivery, error);
    throw error;
  }
};

export const listResendDomains = async () => {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return { configured: false, ok: false, error: 'RESEND_API_KEY is not set', domains: [] };

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        status: res.status,
        error: data.message || data.name || `Resend domains ${res.status}`,
        domains: [],
      };
    }
    const domains = (Array.isArray(data?.data) ? data.data : []).map((domain) => ({
      id: domain.id,
      name: domain.name,
      status: domain.status,
      region: domain.region,
    }));
    return { configured: true, ok: true, domains };
  } catch (error) {
    return { configured: true, ok: false, error: errorText(error), domains: [] };
  }
};

export const getMailStatus = async () => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [deliveries, deliveryTotal, attempts, attemptTotal, grouped, lastSuccess, resend] = await Promise.all([
    MailDelivery.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(40).lean(),
    MailDelivery.countDocuments(),
    MailAttempt.find().sort({ createdAt: -1 }).limit(60).lean(),
    MailAttempt.countDocuments(),
    MailDelivery.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { flow: '$flow', status: '$status' }, count: { $sum: 1 } } },
    ]),
    MailDelivery.findOne({ status: 'sent' }).sort({ sentAt: -1 }).select('flow provider sentAt').lean(),
    listResendDomains(),
  ]);

  const stats = { sent: 0, failed: 0, sending: 0, byFlow: {} };
  for (const row of grouped) {
    const flow = row._id.flow || 'unknown';
    const status = row._id.status || 'unknown';
    if (stats[status] !== undefined) stats[status] += row.count;
    stats.byFlow[flow] = stats.byFlow[flow] || { sent: 0, failed: 0, sending: 0 };
    if (stats.byFlow[flow][status] !== undefined) stats.byFlow[flow][status] += row.count;
  }

  return {
    generatedAt: new Date(),
    config: {
      dryRun: isDryRun(),
      paused: isPaused(),
      chain: providerChain(),
      providers: describeProviders(),
      sendDelayMs: sendDelayMs(),
      appBase: appBase(),
      apiBase: apiBase(),
    },
    stats,
    deliveries,
    deliveryTotal,
    attempts,
    attemptTotal,
    lastSuccess,
    queue: getQueueInfo(),
    resend,
  };
};

// Log the exact reason mail will or will not work at boot. The old system
// stayed silent when no provider was configured, which hid whole weeks of
// missing email.
export const logMailStartup = () => {
  const chain = providerChain();
  if (!chain.length) {
    console.error('[Mail] No provider configured. Set RESEND_API_KEY (recommended) or SENDGRID_API_KEY. Brevo requires BREVO_ENABLED=true; SMTP requires ALLOW_SMTP=true and does not work on Render.');
    return;
  }

  console.log(`[Mail] Provider chain: ${chain.join(' -> ')}`);
  for (const provider of chain) {
    const sender = senderFor(provider);
    console.log(`[Mail] ${provider} sender: ${sender || '(missing sender address)'}`);
  }
  if (isDryRun()) console.warn('[Mail] MAIL_DRY_RUN=true — nothing will leave the server');
  if (isPaused()) console.warn('[Mail] MAIL_PAUSED=true — scheduled and manual sends are disabled');
  if (chain.includes('brevo')) console.warn('[Mail] Brevo is enabled — only use it after compliance reinstates the account');
  if (chain.includes('smtp')) console.warn('[Mail] SMTP is enabled — Render blocks outbound ports 587/465; prefer an HTTPS API');

  if (chain.includes('resend')) {
    listResendDomains().then((result) => {
      if (!result.ok) {
        console.warn(`[Mail] Resend domain check failed: ${result.error}`);
        return;
      }
      if (!result.domains.length) {
        console.warn('[Mail] Resend has no domains yet. Verify jobhexa.com, or use onboarding@resend.dev for a test to the account owner only.');
        return;
      }
      for (const domain of result.domains) {
        console.log(`[Mail] Resend domain ${domain.name}: ${domain.status}`);
      }
    }).catch(() => {});
  }
};

export const maskRecipient = (email) => {
  const value = addressOf(email);
  const [local, domain] = value.split('@');
  if (!domain) return '(invalid)';
  return `${String(local).slice(0, 2)}***@${domain}`;
};

export const shortHash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);

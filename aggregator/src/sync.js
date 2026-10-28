// Auto-import: after each run, push the fresh jobs.json export to the
// JobHexa server so the admin "Aggregator Inbox" fills up with no manual
// uploads. The server upserts on aggregatorMeta.id, so re-syncing the same
// export is idempotent.
//
// Best-effort by design — a failed sync logs a warning but never fails the
// run itself (the fetch results are already safely stored in SQLite).
import fs from 'node:fs';
import { JSON_PATH, SYNC_URL, SYNC_SECRET } from './config.js';
import { postJson } from './http.js';
import { logger } from './logger.js';

const ATTEMPTS = 3;

export async function syncToServer(opts = {}) {
  const url = opts.url ?? SYNC_URL;
  const secret = opts.secret ?? SYNC_SECRET;
  const file = opts.file ?? JSON_PATH;
  const fetchImpl = opts.fetchImpl ?? postJson;
  const timeoutMs = opts.timeoutMs ?? 120000;
  const retryDelayMs = opts.retryDelayMs ?? 2000;

  try {
    if (!url || !secret) {
      logger.info('aggregator sync skipped (set AGG_SYNC_URL + AGG_SYNC_SECRET in .env to enable)');
      return { skipped: true, reason: 'not-configured' };
    }
    if (!fs.existsSync(file)) {
      logger.warn({ file }, 'aggregator sync skipped (no jobs.json export yet)');
      return { skipped: true, reason: 'no-export' };
    }

    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));

    let lastError = '';
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      try {
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-aggregator-sync-secret': secret },
          body: JSON.stringify(payload),
          timeoutMs,
        });
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          const data = body?.data || body;
          logger.info(
            { received: data.received, created: data.created, updated: data.updated, skipped: data.skipped },
            'aggregator sync: inbox imported',
          );
          return { ok: true, ...data };
        }
        lastError = `HTTP ${res.status}`;
        // 4xx other than 429 (bad secret, bad URL, payload too large) won't
        // improve on a retry — bail immediately so a misconfig is obvious.
        if (res.status !== 429 && res.status < 500) break;
      } catch (err) {
        lastError = err.message;
      }
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * retryDelayMs));
    }

    logger.warn({ error: lastError, url }, 'aggregator sync failed (run itself succeeded; inbox not updated)');
    return { ok: false, error: lastError };
  } catch (err) {
    logger.warn({ error: err.message }, 'aggregator sync failed (run itself succeeded; inbox not updated)');
    return { ok: false, error: err.message };
  }
}

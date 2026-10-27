// Low-level HTTP with per-source TLS control, timeouts, redirects,
// gzip support and charset-aware decoding. Uses only node builtins so a
// single source can allow expired certificates without weakening others.
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { USER_AGENT, REQ_TIMEOUT_MS } from './config.js';

const agents = new Map();
function agentFor(url, { ignoreCert = false, legacyTls = false } = {}) {
  const key = `${new URL(url).protocol}//${ignoreCert ? 'insecure' : 'secure'}${legacyTls ? '+legacy' : ''}`;
  if (!agents.has(key)) {
    const mod = new URL(url).protocol === 'https:' ? https : http;
    agents.set(key, new mod.Agent({
      keepAlive: true,
      rejectUnauthorized: !ignoreCert,
      // Old Indian gov sites still require unsafe TLS legacy renegotiation.
      ...(legacyTls ? { secureOptions: crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION } : {}),
    }));
  }
  return agents.get(key);
}

function decodeBody(buf, contentType = '', contentEncoding = '') {
  let data = buf;
  try {
    if (/gzip/i.test(contentEncoding)) data = zlib.gunzipSync(buf);
    else if (/deflate/i.test(contentEncoding)) data = zlib.inflateSync(buf);
    else if (/br/i.test(contentEncoding)) data = zlib.brotliDecompressSync(buf);
  } catch { /* use raw buffer */ }
  const m = /charset=([^;]+)/i.exec(contentType);
  const charset = (m?.[1] || 'utf-8').trim().toLowerCase();
  try {
    return { text: new TextDecoder(charset).decode(data), buffer: Buffer.from(data) };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(data), buffer: Buffer.from(data) };
  }
}

function once(url, { timeoutMs, headers, legacyTls = false, insecureParser = false }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    let settled = false;
    let gotResponse = false;
    // Stall guard: if no data arrives within timeoutMs the promise rejects.
    // This also keeps the event loop alive until we settle, so a dead
    // connection can never drain the loop and exit the process early
    // ("Detected unsettled top-level await").
    let stallTimer = setTimeout(() => {
      finish(reject, new Error(`Timeout after ${timeoutMs}ms for ${url}`));
    }, timeoutMs);
    function finish(fn, value) {
      if (settled) return;
      settled = true;
      clearTimeout(stallTimer);
      fn(value);
    }
    function bump() {
      if (settled) return;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        finish(reject, new Error(`Timeout after ${timeoutMs}ms for ${url}`));
      }, timeoutMs);
    }
    const req = lib.get(url, {
      agent: headers.__agent,
      timeout: timeoutMs,
      // A few gov sites send malformed header tokens; Node's strict parser
      // rejects them with "Parse Error: Invalid header token".
      insecureHTTPParser: insecureParser,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', ...headers.clean },
    }, (res) => {
      gotResponse = true;
      const chunks = [];
      res.on('data', (c) => {
        bump();
        chunks.push(c);
        if (Buffer.concat(chunks).length > 15 * 1024 * 1024) req.destroy(new Error('Response too large (>15MB)'));
      });
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        finish(resolve, { status: res.statusCode || 0, headers: res.headers, ...decodeBody(buf, res.headers['content-type'], res.headers['content-encoding']) });
      });
      // Server closed mid-body: 'end' never fires, so reject explicitly.
      res.on('close', () => finish(reject, new Error(`Connection closed before response completed for ${url}`)));
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout after ${timeoutMs}ms for ${url}`)));
    req.on('error', (err) => finish(reject, err));
    req.on('close', () => {
      if (!gotResponse) finish(reject, new Error(`Connection closed before response for ${url}`));
    });
  });
}

// GET with redirect following (max 5), exponential-backoff retries and
// per-source TLS setting. Never throws for HTTP error statuses — callers decide.
export async function fetchUrl(url, { timeoutMs = REQ_TIMEOUT_MS, retries = 3, ignoreCert = false, legacyTls = false, insecureParser = false, headers = {} } = {}) {
  let current = url;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    try {
      let hops = 0;
      while (hops < 5) {
        const res = await once(current, {
          timeoutMs,
          legacyTls,
          insecureParser,
          headers: { clean: headers, __agent: agentFor(current, { ignoreCert, legacyTls }) },
        });
        if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
          current = new URL(res.headers.location, current).toString();
          hops += 1;
          continue;
        }
        if (res.status === 429) throw Object.assign(new Error(`HTTP 429 for ${current}`), { retryable: true });
        if (res.status >= 500) throw Object.assign(new Error(`HTTP ${res.status} for ${current}`), { retryable: true });
        return { ...res, url: current };
      }
      throw new Error(`Too many redirects for ${url}`);
    } catch (err) {
      lastError = err;
      const retryable = err.retryable || /timeout|ECONN|ENOTFOUND|EPROTO|socket|TLS|SSL|certificate|renegotiat/i.test(err.message);
      if (!retryable || attempt === retries) break;
    }
  }
  return { status: 0, error: lastError?.message || 'fetch failed', url: current };
}

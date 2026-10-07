// Low-level HTTP with per-source TLS control, timeouts, redirects,
// gzip support and charset-aware decoding. Uses only node builtins so a
// single source can allow expired certificates without weakening others.
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { USER_AGENT, REQ_TIMEOUT_MS } from './config.js';

const agents = new Map();
function agentFor(url, ignoreCert) {
  const key = `${new URL(url).protocol}//${ignoreCert ? 'insecure' : 'secure'}`;
  if (!agents.has(key)) {
    const mod = new URL(url).protocol === 'https:' ? https : http;
    agents.set(key, new mod.Agent({ keepAlive: true, rejectUnauthorized: !ignoreCert }));
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

function once(url, { timeoutMs, headers }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(url, {
      agent: headers.__agent,
      timeout: timeoutMs,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', ...headers.clean },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => {
        chunks.push(c);
        if (Buffer.concat(chunks).length > 15 * 1024 * 1024) req.destroy(new Error('Response too large (>15MB)'));
      });
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode || 0, headers: res.headers, ...decodeBody(buf, res.headers['content-type'], res.headers['content-encoding']) });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout after ${timeoutMs}ms for ${url}`)));
    req.on('error', reject);
  });
}

// GET with redirect following (max 5), exponential-backoff retries and
// per-source TLS setting. Never throws for HTTP error statuses — callers decide.
export async function fetchUrl(url, { timeoutMs = REQ_TIMEOUT_MS, retries = 3, ignoreCert = false, headers = {} } = {}) {
  let current = url;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    try {
      let hops = 0;
      while (hops < 5) {
        const res = await once(current, {
          timeoutMs,
          headers: { clean: headers, __agent: agentFor(current, ignoreCert) },
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
      const retryable = err.retryable || /timeout|ECONN|ENOTFOUND|socket|TLS|certificate/i.test(err.message);
      if (!retryable || attempt === retries) break;
    }
  }
  return { status: 0, error: lastError?.message || 'fetch failed', url: current };
}

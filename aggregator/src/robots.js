// robots.txt compliance: cached per origin, fail-open on fetch errors
// (a missing robots file means "allowed"), fail-closed never.
import { fetchUrl } from './http.js';
import { logger } from './logger.js';

const cache = new Map(); // origin -> { rules: [{path, allow}], at }

function parseRobots(text, ua = '*') {
  const rules = [];
  let applies = false;
  for (const line of String(text || '').split('\n')) {
    const [field, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (!field || !value) continue;
    const f = field.trim().toLowerCase();
    if (f === 'user-agent') {
      applies = value === '*' || /jobhexa|aggregator|bot/i.test(value);
    } else if (applies && (f === 'disallow' || f === 'allow')) {
      rules.push({ path: value.split('#')[0].trim(), allow: f === 'allow' });
    }
  }
  return rules;
}

export async function allowedByRobots(url) {
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return false;
  }
  if (!cache.has(origin)) {
    try {
      const res = await fetchUrl(`${origin}/robots.txt`, { retries: 1, timeoutMs: 8000 });
      cache.set(origin, { rules: res.status === 200 ? parseRobots(res.text) : [], at: Date.now() });
    } catch (err) {
      logger.warn({ origin, err: err.message }, 'robots.txt unreachable, allowing');
      cache.set(origin, { rules: [], at: Date.now() });
    }
  }
  const path = new URL(url).pathname || '/';
  let decision = true;
  for (const r of cache.get(origin).rules) {
    if (r.path && path.startsWith(r.path)) decision = r.allow;
  }
  return decision;
}

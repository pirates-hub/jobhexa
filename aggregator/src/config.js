import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

// Minimal .env loader (no dependency): reads aggregator/.env if present and
// fills in only variables NOT already set — the real environment always wins.
// Must run before the env-driven exports below are evaluated.
export function loadEnvFile(file = path.join(root, '.env')) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return false; // no .env is fine — everything falls back to defaults
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value && !(m[1] in process.env)) process.env[m[1]] = value;
  }
  return true;
}
loadEnvFile();

export const ROOT = root;
export const DATA_DIR = path.join(root, 'data');
export const DB_PATH = process.env.AGG_DB || path.join(DATA_DIR, 'jobs.db');
export const JSON_PATH = path.join(DATA_DIR, 'jobs.json');
export const CSV_PATH = path.join(DATA_DIR, 'jobs.csv');
export const HEALTH_PATH = path.join(DATA_DIR, 'health.json');

export const USER_AGENT = process.env.AGG_UA || 'JobHexa-Aggregator/1.0 (+contact: admin@jobhexa.local)';
export const MAX_PARALLEL = parseInt(process.env.AGG_PARALLEL || '5', 10);
export const PER_DOMAIN_DELAY_MS = parseInt(process.env.AGG_DELAY_MS || '2500', 10);
export const REQ_TIMEOUT_MS = parseInt(process.env.AGG_TIMEOUT_MS || '20000', 10);
export const MAX_RETRIES = parseInt(process.env.AGG_RETRIES || '3', 10);
export const CRON_SCHEDULE = process.env.AGG_CRON || '0 */3 * * *';

// Auto-import into the admin "Aggregator Inbox": when both are set, every run
// POSTs the jobs.json export to the JobHexa server (see src/sync.js).
export const SYNC_URL = process.env.AGG_SYNC_URL || '';
export const SYNC_SECRET = process.env.AGG_SYNC_SECRET || '';

export const KEYWORDS = [
  'recruit', 'vacan', 'advertisement', 'notification', 'employment',
  'career', 'opportunit', 'apply', 'engagement', 'apprentice',
  'corrigendum', 'addendum', 'walk-in', 'walkin',
];

export function loadSources() {
  const raw = fs.readFileSync(path.join(root, 'sources.json'), 'utf8');
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error('sources.json must be an array');
  for (const s of list) {
    for (const f of ['id', 'name', 'state', 'type', 'url', 'method']) {
      if (!s[f]) throw new Error(`source missing required field "${f}": ${JSON.stringify(s).slice(0, 80)}`);
    }
    if (!['rss', 'html', 'playwright', 'pdf'].includes(s.method)) throw new Error(`bad method for ${s.id}`);
  }
  return list;
}

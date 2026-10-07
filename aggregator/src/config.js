import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

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

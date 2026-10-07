import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH, JSON_PATH, CSV_PATH } from './config.js';
import { logger } from './logger.js';

let db = null;
let DatabaseSync = null;

export function openDb(dbPath = DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return import('node:sqlite').then((m) => {
    DatabaseSync = m.DatabaseSync;
    db = new DatabaseSync(dbPath === ':memory:' ? ':memory:' : dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      state TEXT NOT NULL,
      organization TEXT,
      title TEXT NOT NULL,
      postName TEXT,
      vacancies INTEGER,
      qualification TEXT,
      ageLimit TEXT,
      salary TEXT,
      applicationStart TEXT,
      lastDate TEXT,
      notificationUrl TEXT NOT NULL,
      applyUrl TEXT,
      category TEXT DEFAULT 'active',
      fetchedAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_id ON jobs(id);
    CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);
    CREATE TABLE IF NOT EXISTS job_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jobId TEXT NOT NULL,
      changedAt TEXT NOT NULL,
      field TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT
    );
  `);
    return db;
  });
}

export function jobId(org, title, lastDate) {
  return crypto.createHash('sha256').update(`${org}::${title}::${lastDate || ''}`.toLowerCase()).digest('hex');
}

function isExpired(lastDate) {
  if (!lastDate) return false;
  return new Date(lastDate + 'T23:59:59') < new Date();
}

// Insert or update. Returns 'new' | 'updated' | 'unchanged'.
export function upsertJob(job) {
  const now = new Date().toISOString();
  const id = job.id || jobId(job.organization, job.title, job.lastDate);
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  const row = {
    id,
    source: job.source,
    state: job.state || 'All India',
    organization: job.organization || null,
    title: job.title,
    postName: job.postName || null,
    vacancies: job.vacancies ?? null,
    qualification: job.qualification || null,
    ageLimit: job.ageLimit || null,
    salary: job.salary || null,
    applicationStart: job.applicationStart || null,
    lastDate: job.lastDate || null,
    notificationUrl: job.notificationUrl,
    applyUrl: job.applyUrl || job.notificationUrl,
    fetchedAt: now,
  };
  if (!existing) {
    row.category = isExpired(row.lastDate) ? 'expired' : 'new';
    db.prepare(`INSERT INTO jobs (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map((k) => `@${k}`).join(',')})`).run(row);
    return 'new';
  }
  const tracked = ['lastDate', 'vacancies'];
  let changed = false;
  const hist = db.prepare('INSERT INTO job_history (jobId, changedAt, field, oldValue, newValue) VALUES (?, ?, ?, ?, ?)');
  for (const f of tracked) {
    if (String(existing[f] ?? '') !== String(row[f] ?? '')) {
      hist.run(id, now, f, existing[f] == null ? null : String(existing[f]), row[f] == null ? null : String(row[f]));
      changed = true;
    }
  }
  const category = isExpired(row.lastDate ?? existing.lastDate) ? 'expired'
    : changed ? 'active'
    : existing.category === 'new' ? 'new' : 'active';
  db.prepare(`UPDATE jobs SET ${Object.keys(row).filter((k) => k !== 'id').map((k) => `${k} = @${k}`).join(', ')}, category = @category WHERE id = @id`).run({ ...row, category });
  // Sweep anything whose date passed while untouched
  db.prepare(`UPDATE jobs SET category = 'expired' WHERE lastDate IS NOT NULL AND date(lastDate) < date('now') AND category != 'expired'`).run();
  return changed ? 'updated' : 'unchanged';
}

export function markClosingSoon(days = 7) {
  const rows = db.prepare(`SELECT id, lastDate FROM jobs WHERE category IN ('new','active') AND lastDate IS NOT NULL`).all();
  let n = 0;
  const now = new Date();
  for (const r of rows) {
    const diff = Math.ceil((new Date(r.lastDate + 'T23:59:59') - now) / 86400000);
    if (diff >= 0 && diff <= days) {
      db.prepare(`UPDATE jobs SET category = 'closing_soon' WHERE id = ?`).run(r.id);
      n += 1;
    }
  }
  return n;
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportFiles() {
  const jobs = db.prepare('SELECT * FROM jobs ORDER BY lastDate DESC').all();
  fs.writeFileSync(JSON_PATH, JSON.stringify(jobs, null, 2));
  const cols = ['id', 'source', 'state', 'organization', 'title', 'postName', 'vacancies', 'qualification', 'ageLimit', 'salary', 'applicationStart', 'lastDate', 'notificationUrl', 'applyUrl', 'category', 'fetchedAt'];
  const csv = [cols.join(','), ...jobs.map((j) => cols.map((c) => csvCell(j[c])).join(','))].join('\n');
  fs.writeFileSync(CSV_PATH, csv);
  logger.info({ jobs: jobs.length, json: JSON_PATH, csv: CSV_PATH }, 'exports written');
  return jobs.length;
}

export function closeDb() {
  try { db?.close(); } catch {}
  db = null;
}

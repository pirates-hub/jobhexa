import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'data', 'jobs.db');
const healthPath = path.join(root, 'data', 'health.json');

if (!fs.existsSync(dbPath)) {
  console.error(`No database at ${dbPath}. Run "npm run once" first.`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const total = db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n;
const newCount = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE category = 'new'").get().n;
const byCategory = db.prepare('SELECT category, COUNT(*) AS n FROM jobs GROUP BY category ORDER BY n DESC').all();
const newJobs = db.prepare("SELECT source, organization, title, lastDate, fetchedAt FROM jobs WHERE category = 'new' ORDER BY fetchedAt DESC LIMIT 25").all();
db.close();

const lastRun = fs.existsSync(healthPath) ? JSON.parse(fs.readFileSync(healthPath, 'utf8')) : null;

console.log(`Total jobs in DB: ${total}`);
console.table(byCategory);

if (lastRun) {
  console.log(`Last run: ${lastRun.at}`);
  console.log(`  sources ok: ${lastRun.succeeded}/${lastRun.sourcesTried} | failed: ${lastRun.failed} | skipped: ${lastRun.skipped}`);
  console.log(`  newOrUpdated: ${lastRun.newOrUpdated} | totalJobs: ${lastRun.totalJobs} | closingSoon: ${lastRun.closingSoon}`);
  if (lastRun.empty?.length) console.log(`  empty sources: ${lastRun.empty.join(', ')}`);
  for (const f of lastRun.failures || []) console.log(`  FAILED ${f.id}: ${f.error}`);
}

console.log(`\nNew jobs (category='new'): ${newCount}`);
if (newJobs.length) console.table(newJobs);

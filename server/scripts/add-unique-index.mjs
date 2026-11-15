// Adds the unique compound index used for duplicate detection.
//
//   node scripts/add-unique-index.mjs --dry-run   (default) report only
//   node scripts/add-unique-index.mjs --apply     actually create the index
//
// Duplicate listings must be resolved FIRST (see mongo-report.mjs) — creating
// a unique index while duplicates exist fails with E11000. This script checks
// and refuses rather than dropping/merging anything.
import dns from 'node:dns';
try { dns.setServers(['1.1.1.1', '8.8.8.8']); } catch {}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  const raw = fs.readFileSync(path.join(here, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* optional */ }

const apply = process.argv.includes('--apply');
const { default: mongoose } = await import('mongoose');
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const KEY = { title: 1, department: 1, state: 1, applicationEndDate: 1 };
const NAME = 'uniq_job_dup_key';

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  const existing = await db.collection('jobs').indexes();
  const already = existing.find((i) => i.name === NAME);
  if (already) {
    console.log(`Index "${NAME}" already exists — nothing to do.`);
    console.log(JSON.stringify(already.key));
    await mongoose.disconnect();
    process.exit(0);
  }

  // Would duplicates violate the unique key?
  const dupes = await db.collection('jobs').aggregate([
    { $group: {
      _id: { $toLower: { $concat: [{ $ifNull: ['$title', ''] }, '|', { $ifNull: ['$department', ''] }, '|', { $ifNull: ['$state', ''] }, '|', { $toString: { $ifNull: ['$applicationEndDate', ''] } }] } },
      n: { $sum: 1 },
    } },
    { $match: { n: { $gt: 1 } } },
    { $count: 'groups' },
  ]).toArray();
  const groups = dupes[0]?.groups || 0;

  console.log(`Duplicate groups on the unique key: ${groups}`);
  if (groups > 0) {
    console.log('CANNOT apply unique index yet — resolve duplicates first (approval step).');
    await mongoose.disconnect();
    process.exit(groups > 0 ? 2 : 0);
  }

  if (!apply) {
    console.log('Dry run OK: no blocking duplicates. Re-run with --apply to create the index.');
    await mongoose.disconnect();
    process.exit(0);
  }

  await db.collection('jobs').createIndex(KEY, { name: NAME, unique: true });
  console.log(`Created unique index "${NAME}" on { title, department, state, applicationEndDate }.`);
  await mongoose.disconnect();
  process.exit(0);
} catch (e) {
  console.error('INDEX SCRIPT FAILED: ' + e.message);
  process.exit(1);
}

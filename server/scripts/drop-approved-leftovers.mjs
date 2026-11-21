// APPROVED cleanup (see cleanup-and-optimize session, user sign-off):
//   1. Drop leftover collections no code references:
//        collected_government_jobs  (≈2 docs, old schema)
//        collector_runs             (≈10 docs, old schema)
//   2. Drop redundant prefix indexes (the compound index serves the same queries):
//        maildeliveries.user_1      (prefix of user_1_createdAt_-1)
//        savedresources.user_1      (prefix of user_1_... compound, if present)
//
//   node scripts/drop-approved-leftovers.mjs --dry-run   (default: report only)
//   node scripts/drop-approved-leftovers.mjs --apply
//
// Everything is name-checked first: anything missing is skipped and reported.
// No other collection or index is ever touched by this script.
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

const DROP_COLLECTIONS = ['collected_government_jobs', 'collector_runs'];
const DROP_INDEXES = [
  { collection: 'maildeliveries', index: 'user_1' },
  { collection: 'savedresources', index: 'user_1' },
];

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  console.log(`mode: ${apply ? 'APPLY' : 'dry-run'}`);

  for (const name of DROP_COLLECTIONS) {
    if (!existing.has(name)) { console.log(`  skip (absent): collection ${name}`); continue; }
    const n = await db.collection(name).estimatedDocumentCount();
    if (!apply) { console.log(`  would drop: collection ${name} (${n} docs)`); continue; }
    await db.collection(name).drop();
    console.log(`  dropped: collection ${name} (${n} docs)`);
  }

  for (const { collection, index } of DROP_INDEXES) {
    if (!existing.has(collection)) { console.log(`  skip (absent): collection ${collection}`); continue; }
    const idx = await db.collection(collection).indexes();
    if (!idx.some((i) => i.name === index)) { console.log(`  skip (absent): ${collection}.${index}`); continue; }
    if (!apply) { console.log(`  would drop index: ${collection}.${index}`); continue; }
    await db.collection(collection).dropIndex(index);
    console.log(`  dropped index: ${collection}.${index}`);
  }

  if (!apply) console.log('\nDry run only. Re-run with --apply to execute.');
  else console.log('\nDone. Re-run `npm run db:report` to verify.');
  await mongoose.disconnect();
  process.exit(0);
} catch (e) {
  console.error('FAILED: ' + e.message);
  process.exit(1);
}

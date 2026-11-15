// READ-ONLY MongoDB inventory + duplicate report for JobHexa.
//
//   node scripts/mongo-report.mjs            full report
//   node scripts/mongo-report.mjs --dups     duplicates only
//
// Connects with MONGODB_URI from server/.env. NEVER writes, drops, merges or
// modifies anything — the duplicate list is printed for human approval only.
import dns from 'node:dns';
try { dns.setServers(['1.1.1.1', '8.8.8.8']); } catch {}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Minimal .env loader (no deps): only fills variables NOT already set.
try {
  const raw = fs.readFileSync(path.join(here, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env optional */ }

const { default: mongoose } = await import('mongoose');
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

// Indexes declared in server/src/models/*.js (via schema.index / field options).
// Anything in the DB NOT listed here is a leftover from an older schema.
const CODE_DECLARED = {
  jobs: ['_id_', 'slug_1', 'advertisementNumber_1', 'notificationPdfHash_1',
    'aggregatorMeta.id_1', 'examType_1', 'state_1', 'jobStatus_1',
    'applicationEndDate_1', 'title_text_description_text_department_text',
    'uniq_job_dup_key'],
  collectionruns: ['_id_', 'kind_1_startTime_-1', 'source_1_startTime_-1'],
  sourcestates: ['_id_', 'source_1'],
  users: ['_id_', 'email_1', 'googleId_1', 'githubId_1', 'state_1', 'category_1'],
};

const dupsOnly = process.argv.includes('--dups');

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((c) => c.name);

  if (!dupsOnly) {
    console.log('=== COLLECTIONS ===');
    for (const name of collections) {
      const count = await db.collection(name).estimatedDocumentCount();
      const size = await db.command({ collStats: name, scale: 1 }).catch(() => null);
      console.log(`  ${name}  docs≈${count}` + (size?.size ? `  size=${(size.size / 1048576).toFixed(2)} MB` : ''));
    }

    console.log('\n=== INDEXES (flagged when not declared in current models) ===');
    for (const name of collections) {
      const idx = await db.collection(name).indexes();
      console.log(`  [${name}]`);
      for (const i of idx) {
        const key = Object.entries(i.key).map(([k, v]) => `${k}_${v}`).join('_');
        const declared = CODE_DECLARED[name]?.includes(i.name);
        const flag = i.name === '_id_' ? '' : (declared === false ? '   <-- NOT in current code (candidate leftover)' : '');
        const uniq = i.unique ? '  [unique]' : '';
        console.log(`    ${i.name}  {${key}}${uniq}${flag}`);
      }
      // Redundant compound prefixes: {a:1,b:1} makes {a:1} redundant.
      const multi = idx.filter((i) => Object.keys(i.key).length > 1);
      for (const m of multi) {
        const keys = Object.keys(m.key);
        const first = keys[0];
        const redundant = idx.find((i) => i.name !== '_id_' && i.name !== m.name
          && Object.keys(i.key).length === 1 && i.key[first] === m.key[first]);
        if (redundant) console.log(`    FLAG: ${redundant.name} is a prefix of ${m.name} (redundant)`);
      }
    }
  }

  // ---- Duplicate job listings: report ONLY, no writes ----
  console.log('\n=== DUPLICATE JOB GROUPS (title+department+state+applicationEndDate) ===');
  const groups = await db.collection('jobs').aggregate([
    {
      $addFields: {
        _dupKey: {
          $toLower: {
            $trim: {
              input: {
                $replaceAll: {
                  input: { $concat: [{ $ifNull: ['$title', ''] }, '|', { $ifNull: ['$department', ''] }, '|', { $ifNull: ['$state', ''] }, '|', { $toString: { $ifNull: ['$applicationEndDate', ''] } }] },
                  find: ' ',
                  replacement: ' ',
                },
              },
            },
          },
        },
      },
    },
    { $group: { _id: '$_dupKey', ids: { $push: '$_id' }, n: { $sum: 1 }, titles: { $addToSet: '$title' }, sources: { $addToSet: '$source' }, statuses: { $addToSet: '$verificationStatus' } } },
    { $match: { n: { $gt: 1 } } },
    { $sort: { n: -1 } },
  ]).toArray();

  console.log(`  ${groups.length} duplicate group(s), ${groups.reduce((s, g) => s + g.n, 0)} documents total:`);
  for (const g of groups) {
    console.log(`  - "${g.titles[0]}"  x${g.n}  sources=[${[...g.sources].join(',')}]  ids=[${g.ids.map(String).join(', ')}]`);
  }

  // Sanity counters for the approval decision.
  const total = await db.collection('jobs').estimatedDocumentCount();
  const bySource = await db.collection('jobs').aggregate([{ $group: { _id: '$source', n: { $sum: 1 } } }, { $sort: { n: -1 } }]).toArray();
  console.log(`\n=== JOBS SUMMARY ===  total≈${total}`);
  for (const b of bySource) console.log(`  source=${b._id ?? 'null'}  ${b.n}`);

  console.log('\nNO CHANGES MADE (read-only report).');
  await mongoose.disconnect();
  process.exit(0);
} catch (e) {
  console.error('REPORT FAILED: ' + e.message);
  process.exit(1);
}

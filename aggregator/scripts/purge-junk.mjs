// One-off: delete junk-titled jobs from the aggregator SQLite store and
// re-export jobs.json. Usage: node scripts/purge-junk.mjs
import { openDb, exportFiles, closeDb } from '../src/store.js';
import { isRecruitmentTitle } from '../src/quality.js';

const db = await openDb();
const jobs = db.prepare('SELECT id, title, source FROM jobs').all();
const junk = jobs.filter((j) => !isRecruitmentTitle(j.title));
console.log(`jobs in db: ${jobs.length} | junk to delete: ${junk.length}`);
const del = db.prepare('DELETE FROM jobs WHERE id = ?');
for (const j of junk) {
  console.log('  -', JSON.stringify(j.title.slice(0, 90)), '|', j.source);
  del.run(j.id);
}
const total = exportFiles();
console.log('remaining:', total);
closeDb();

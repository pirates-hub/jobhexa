// Dry-run the quality gate with per-tier reasons: what it rejects (and why),
// and what suspicious junk still passes (eyeball both before wiring the gate).
import fs from 'node:fs';
import { rejectReason } from '../src/quality.js';

const jobs = JSON.parse(fs.readFileSync('./data/jobs.json', 'utf8'));

const rejected = jobs.map((j) => ({ j, reason: rejectReason(j.title) })).filter((x) => x.reason);
const suspiciousPass = jobs.filter((j) => !rejectReason(j.title) && (j.title.trim().length < 30 || !/\d/.test(j.title)));

console.log(`total: ${jobs.length} | would reject: ${rejected.length}`);
console.log('\n== REJECTED (by tier) ==');
for (const { j, reason } of rejected) {
  console.log(`  ✗ [${reason}]`, JSON.stringify(j.title.slice(0, 95)), '|', j.source);
}
console.log(`\n== PASSES but suspicious (short or no digits): ${suspiciousPass.length} ==`);
suspiciousPass.forEach((j) => console.log('  ?', JSON.stringify(j.title.slice(0, 95)), '|', j.source));

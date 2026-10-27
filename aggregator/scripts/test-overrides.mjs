// Verify the three new overrides before a full run: node scripts/test-overrides.mjs
import { loadSources } from '../src/config.js';
import { htmlAdapter } from '../src/adapters/index.js';

const sources = loadSources();
for (const id of ['ssc', 'uppsc', 'opsc']) {
  const s = sources.find((x) => x.id === id);
  if (!s) { console.log(id, 'NOT FOUND'); continue; }
  const t0 = Date.now();
  const out = await htmlAdapter(s);
  console.log(`\n== ${id} ok=${out.ok} docs=${out.docs?.length} ms=${Date.now() - t0}`, out.error || '');
  for (const d of (out.docs || []).slice(0, 6)) {
    console.log(`   > ${d.label.slice(0, 90)} | ${d.url.slice(0, 95)}`);
  }
}

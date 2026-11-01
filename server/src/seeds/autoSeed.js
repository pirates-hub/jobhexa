import mongoose from 'mongoose';

// Keeps the live database complete without any manual seeding step.
// Every seeder in seed.js is idempotent (existing documents are skipped),
// so running this on every boot only ever ADDS what's missing — new topics,
// new mock tests, new subjects — and never touches existing data.
let ran = false;

async function backfill() {
  if (ran) return;
  ran = true;
  try {
    const { runSeed } = await import('./seed.js');
    await runSeed();
    console.log('[AutoSeed] Reference-data backfill complete');
  } catch (e) {
    // Never let seeding take the API down.
    console.error('[AutoSeed] Backfill failed (non-fatal):', e.message);
  }
}

// Server boots before the DB connection finishes — wait for it.
if (mongoose.connection.readyState === 1) {
  backfill();
} else {
  mongoose.connection.once('open', backfill);
}

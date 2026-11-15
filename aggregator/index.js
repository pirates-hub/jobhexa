#!/usr/bin/env node
// CLI + scheduler. Fetch and store only — no frontend, no notifications.
//
//   node index.js --once                  full run now
//   node index.js --once --source tnpsc   one source
//   node index.js --once --state "Tamil Nadu"
//   node index.js                         scheduler (default every 3 hours)
import cron from 'node-cron';
import { runAll } from './src/run.js';
import { syncToServer } from './src/sync.js';
import { logger } from './src/logger.js';
import { CRON_SCHEDULE } from './src/config.js';

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

if (args.includes('--once')) {
  try {
    const summary = await runAll({ onlySource: get('--source'), onlyState: get('--state') });
    // Auto-import into the admin inbox (skipped when AGG_SYNC_* is unset).
    await syncToServer();
    console.log(JSON.stringify(summary, null, 2));

    // External government sites are flaky and frequently reject or timeout.
    // Treat per-source fetch failures as non-fatal by default; only exit 2 when
    // the caller explicitly opts into a strict failure policy.
    const strictSourceFailureMode = process.env.AGG_FAIL_ON_SOURCE_ERRORS === 'true';
    if (strictSourceFailureMode && summary.failed > 0) {
      logger.warn({ failed: summary.failed, failures: summary.failures.slice(0, 5) }, 'strict mode: source failures caused exit code 2');
      process.exit(2);
    }

    process.exit(0);
  } catch (err) {
    logger.error({ err: err.message }, 'run failed');
    process.exit(1);
  }
} else {
  logger.info({ schedule: CRON_SCHEDULE }, 'scheduler started (Ctrl+C to stop)');

  // Overlap guard: external sites are slow, so a run can outlast the 3h tick.
  // Skipping the tick is correct — never let two runs share the SQLite DB.
  let currentRun = null;
  cron.schedule(CRON_SCHEDULE, async () => {
    if (currentRun) {
      logger.warn({}, 'previous run still in progress — skipping this tick');
      return;
    }
    currentRun = (async () => {
      try {
        await runAll();
        await syncToServer();
      } catch (err) {
        logger.error({ err: err.message }, 'scheduled run failed');
      } finally {
        currentRun = null;
      }
    })();
    await currentRun;
  });

  // Graceful stop: let an in-flight run finish (bounded) so SQLite state and
  // health.json are consistent, then exit. Second signal exits immediately.
  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) process.exit(1);
    stopping = true;
    logger.info({ signal }, 'shutdown requested — waiting for in-flight run (max 30s)');
    if (currentRun) {
      await Promise.race([
        currentRun,
        new Promise((r) => setTimeout(r, 30000)),
      ]);
    }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

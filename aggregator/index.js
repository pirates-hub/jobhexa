#!/usr/bin/env node
// CLI + scheduler. Fetch and store only — no frontend, no notifications.
//
//   node index.js --once                  full run now
//   node index.js --once --source tnpsc   one source
//   node index.js --once --state "Tamil Nadu"
//   node index.js                         scheduler (default every 3 hours)
import cron from 'node-cron';
import { runAll } from './src/run.js';
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
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await runAll();
    } catch (err) {
      logger.error({ err: err.message }, 'scheduled run failed');
    }
  });
}

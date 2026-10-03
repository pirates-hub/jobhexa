import cron from 'node-cron';
import { runDailyCollection, runWeeklyStateRefresh, runMonthlyReconciliation } from './jobCollection.service.js';

export const startCollectionCrons = () => {
  const tz = { timezone: 'Asia/Kolkata' };
  // DAILY incremental: every morning 7:30 AM IST (2:00 AM UTC), after the
  // 6 AM status updater. Auto sources only; new/changed docs only.
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Collection] Daily run starting...');
      const results = await runDailyCollection();
      const created = results.reduce((n, r) => n + (r.jobsCreated || 0), 0);
      console.log(`[Collection] Daily done: ${results.length} sources, ${created} pending created`);
    } catch (e) {
      console.error('[Collection] Daily run failed:', e.message);
    }
  }, tz);

  // WEEKLY state-wise refresh: every Sunday 7 AM IST. Refreshes every state.
  cron.schedule('0 7 * * 0', async () => {
    try {
      console.log('[Collection] Weekly state refresh starting...');
      const stats = await runWeeklyStateRefresh();
      const results = await runDailyCollection();
      const created = results.reduce((n, r) => n + (r.jobsCreated || 0), 0);
      console.log('[Collection] Weekly done: refreshed ' + stats.checked + ' jobs across ' + stats.states + ' states; collector found ' + created + ' new pending jobs across ' + results.length + ' sources');
    } catch (e) {
      console.error('[Collection] Weekly run failed:', e.message);
    }
  }, tz);

  // MONTHLY full reconciliation: 1st of every month, 7:45 AM IST.
  cron.schedule('45 7 1 * *', async () => {
    try {
      console.log('[Collection] Monthly reconciliation starting...');
      const stats = await runMonthlyReconciliation();
      const results = await runDailyCollection();
      const created = results.reduce((n, r) => n + (r.jobsCreated || 0), 0);
      console.log('[Collection] Monthly done: reconciled ' + stats.checked + ' jobs (' + stats.changed + ' changed, ' + stats.expired + ' expired); collector found ' + created + ' new pending jobs across ' + results.length + ' sources');
    } catch (e) {
      console.error('[Collection] Monthly run failed:', e.message);
    }
  }, tz);

  console.log('[Collection] Crons scheduled: daily 7:30 AM IST, weekly Sunday 7 AM IST, monthly 1st 7:45 AM IST');
};

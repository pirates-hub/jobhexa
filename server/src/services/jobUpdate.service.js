import cron from 'node-cron';
import Job from '../models/Job.js';
import { windowStatus } from '../utils/jobStatus.js';

export const updateJobStatuses = async () => {
  console.log('[JobUpdate] Checking job statuses...');
  const now = new Date();
  let updated = 0;

  const jobs = await Job.find({});
  for (const job of jobs) {
    // Shared window rule (src/utils/jobStatus.js) — same rule the collector
    // and weekly refresh use. null = indeterminate, keep the current status.
    const newStatus = windowStatus(job.applicationStartDate, job.applicationEndDate, now) ?? job.jobStatus;

    if (newStatus !== job.jobStatus) {
      job.jobStatus = newStatus;
      job.lastVerifiedDate = new Date();
      await job.save();
      updated++;
    }
  }

  console.log(`[JobUpdate] Updated ${updated} jobs`);
  return updated;
};

export const startJobUpdateCron = () => {
  // Run daily at 6 AM IST with Asia/Kolkata timezone
  return cron.schedule('30 0 * * *', async () => {
    try {
      await updateJobStatuses();
    } catch (e) {
      console.error('[JobUpdate] Cron failed', e.message);
    }
  }, { timezone: 'Asia/Kolkata' });
};

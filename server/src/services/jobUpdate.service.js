import cron from 'node-cron';
import Job from '../models/Job.js';

export const updateJobStatuses = async () => {
  console.log('[JobUpdate] Checking job statuses...');
  const now = new Date();
  let updated = 0;

  const jobs = await Job.find({});
  for (const job of jobs) {
    let newStatus = job.jobStatus;
    if (job.applicationEndDate && new Date(job.applicationEndDate) < now) {
      newStatus = 'closed';
    } else if (job.applicationStartDate && new Date(job.applicationStartDate) > now) {
      newStatus = 'upcoming';
    } else if (job.applicationStartDate && job.applicationEndDate && new Date(job.applicationStartDate) <= now && new Date(job.applicationEndDate) >= now) {
      const days = Math.ceil((new Date(job.applicationEndDate) - now) / 86400000);
      newStatus = days <= 3 ? 'closing_soon' : 'active';
    }

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
  cron.schedule('30 0 * * *', async () => {
    try {
      await updateJobStatuses();
    } catch (e) {
      console.error('[JobUpdate] Cron failed', e.message);
    }
  }, { timezone: 'Asia/Kolkata' });
  console.log('[JobUpdate] Cron scheduled for daily 6 AM IST');
};

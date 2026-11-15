import cron from 'node-cron';
import Job from '../models/Job.js';
import { windowStatus } from '../utils/jobStatus.js';
import { invalidateJobCache } from '../utils/cache.js';

// Writes are batched: read only the three fields the window rule needs
// (lean projection) and apply every status change in chunked bulkWrites —
// one round trip per 500 changes instead of two per job.
const BULK_CHUNK = 500;

const flushOps = async (ops) => {
  let written = 0;
  for (let i = 0; i < ops.length; i += BULK_CHUNK) {
    const res = await Job.bulkWrite(ops.slice(i, i + BULK_CHUNK), { ordered: false });
    written += res.modifiedCount ?? res.matchedCount ?? 0;
  }
  return written;
};

export const updateJobStatuses = async () => {
  console.log('[JobUpdate] Checking job statuses...');
  const now = new Date();

  const jobs = await Job.find({}, 'jobStatus applicationStartDate applicationEndDate').lean();

  const ops = [];
  for (const job of jobs) {
    // Shared window rule (src/utils/jobStatus.js) — same rule the collector
    // and weekly refresh use. null = indeterminate, keep the current status.
    const newStatus = windowStatus(job.applicationStartDate, job.applicationEndDate, now) ?? job.jobStatus;

    if (newStatus !== job.jobStatus) {
      ops.push({
        updateOne: {
          filter: { _id: job._id },
          update: { $set: { jobStatus: newStatus, lastVerifiedDate: now } },
        },
      });
    }
  }

  const updated = ops.length ? await flushOps(ops) : 0;
  if (updated > 0) invalidateJobCache();

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

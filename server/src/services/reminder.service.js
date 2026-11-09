import { runAllFlows } from './mail/flows.js';
import { startMailScheduler } from './mail/scheduler.js';

// Compatibility facade. The old reminder service owned both the in-app
// notifications and the SMTP sends. The rebuilt mail system now lives in
// services/mail; these exports keep older routes/scripts working.

export {
  checkDeadlines,
  checkStudyPlans,
  claimStudyPlanDay,
  sendEligibleDigest,
  studyPlanLogKey,
} from './mail/flows.js';

// Dropped: the 7:30 in-app-only "Daily digest" duplicated the eligible-jobs
// bell and the daily email. Kept as a no-op so old callers do not crash.
export const sendDailyDigest = async () => 0;

export const runAllNotificationChecks = async () => {
  const flows = await runAllFlows();
  return {
    deadlines: flows.deadline_reminder?.sent || 0,
    studyPlans: flows.study_plan?.sent || 0,
    digests: 0,
    eligible: flows.eligible_digest?.sent || 0,
    flows,
  };
};

export const startReminderCron = (opts = {}) => startMailScheduler(opts);

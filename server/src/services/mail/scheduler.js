import cron from 'node-cron';
import { logMailStartup } from './mailer.js';
import { checkDeadlines, checkStudyPlans, runAllFlows, sendEligibleDigest } from './flows.js';

const tasks = [];
let started = false;

const enabled = () => !['1', 'true', 'yes', 'on'].includes(String(process.env.MAIL_SCHEDULER_DISABLED || '').toLowerCase());

/**
 * All times are Asia/Kolkata. Running at 2–3 AM IST (the old setup) meant the
 * free Render instance was always asleep, so the crons never fired.
 */
export const startMailScheduler = ({ runOnBoot = true } = {}) => {
  if (started) {
    console.log('[Mail] Scheduler already started');
    return false;
  }
  started = true;

  logMailStartup();

  if (!enabled()) {
    console.warn('[Mail] MAIL_SCHEDULER_DISABLED=true — cron schedules are off');
    return true;
  }

  const tz = { timezone: 'Asia/Kolkata' };
  const guard = (name, fn) => () => {
    fn().catch((error) => console.error(`[Mail] ${name} cron failed: ${error.message}`));
  };

  tasks.push(cron.schedule('0 7 * * *', guard('eligible digest', sendEligibleDigest), tz));
  // 7:45 retry only picks up rows still marked failed/sending. Sent periods
  // are skipped by MailDelivery, so this cannot duplicate the 7 AM mail.
  tasks.push(cron.schedule('45 7 * * *', guard('eligible digest retry', sendEligibleDigest), tz));
  tasks.push(cron.schedule('0 8 * * *', guard('study plan', checkStudyPlans), tz));
  tasks.push(cron.schedule('0 9 * * *', guard('deadline reminders', checkDeadlines), tz));

  console.log('[Mail] Crons (Asia/Kolkata): 7:00 eligible digest, 7:45 retry, 8:00 study plan, 9:00 deadlines');

  const bootCatchUp = runOnBoot
    && !['0', 'false', 'no', 'off'].includes(String(process.env.MAIL_BOOT_CATCHUP || '').toLowerCase());
  if (bootCatchUp) {
    // The instance may have been asleep at 7/8/9 AM. MailDelivery makes this
    // safe: anything already sent for today is skipped.
    setTimeout(() => {
      runAllFlows().catch((error) => console.error('[Mail] boot catch-up failed:', error.message));
    }, 10 * 1000);
  }

  return true;
};

export const stopMailScheduler = () => {
  while (tasks.length) {
    try { tasks.pop().stop(); } catch {}
  }
  started = false;
};

export const isMailSchedulerRunning = () => started;

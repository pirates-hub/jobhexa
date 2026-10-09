import cron from 'node-cron';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import NotificationLog from '../models/NotificationLog.js';
import SavedJob from '../models/SavedJob.js';
import Application from '../models/Application.js';
import { sendDeadlineReminder } from './email.service.js';

const REMINDER_DAYS = [7, 3, 1, 0];

export const checkDeadlines = async () => {
  console.log('[Reminder] Checking deadlines...');
  const now = new Date();
  const jobs = await Job.find({ jobStatus: { $in: ['active', 'closing_soon'] }, verificationStatus: 'verified', applicationEndDate: { $gte: now } });
  let sent = 0;
  for (const job of jobs) {
    const daysLeft = Math.ceil((new Date(job.applicationEndDate) - now) / (1000 * 60 * 60 * 24));
    if (!REMINDER_DAYS.includes(daysLeft)) continue;
    const type = daysLeft === 0 ? 'deadline_today' : `deadline_${daysLeft}day`;
    // Audience: ONLY users tracking this job (saved or applied) who opted into
    // deadline reminders — never a broad capped blast.
    const [saved, applied] = await Promise.all([
      SavedJob.find({ job: job._id }).select('user'),
      Application.find({ job: job._id, status: { $ne: 'withdrawn' } }).select('user'),
    ]);
    const ids = [...new Set([...saved, ...applied].map((r) => String(r.user)))];
    if (!ids.length) continue;
    const users = await User.find({ _id: { $in: ids }, 'notificationPreferences.deadlineReminders': { $ne: false } });
    for (const user of users) {
      const exists = await NotificationLog.findOne({ user: user._id, job: job._id, notificationType: type });
      if (exists) continue;
      await Notification.create({ user: user._id, type, title: `Deadline: ${job.title}`, message: `${daysLeft === 0 ? 'Today is last day' : `${daysLeft} days left`} to apply for ${job.title}`, jobId: job._id });
      await NotificationLog.create({ user: user._id, job: job._id, notificationType: type, method: 'in_app' });
      // Email if enabled
      if (user.notificationPreferences?.email !== false && user.email) {
        try { await sendDeadlineReminder(user, job, daysLeft);
          await NotificationLog.updateOne({ user: user._id, job: job._id, notificationType: type }, { method: 'both' });
        } catch (e) { console.error('Email failed', e.message); }
      }
      sent++;
    }
  }
  console.log(`[Reminder] Sent ${sent} notifications`);
  return sent;
};

export const studyPlanLogKey = (day, date = new Date()) =>
  `studyplan_day_${day}_${date.toISOString().split('T')[0]}`;

// Single dedup gate for study-plan day mails, shared by the manual start
// route and the scheduled job. Returns true when this caller won the send
// (creates the log row); false when another path already sent it.
export const claimStudyPlanDay = async (userId, planId, day, date = new Date()) => {
  try {
    await NotificationLog.create({
      user: userId,
      job: planId,
      notificationType: studyPlanLogKey(day, date),
      method: 'in_app',
    });
    return true;
  } catch (e) {
    if (e.code === 11000) return false; // already sent today
    throw e;
  }
};

export const checkStudyPlans = async () => {
  let sent = 0;
  try {
    const StudyPlan = (await import('../models/StudyPlan.js')).default;
    const plans = await StudyPlan.find({ isActive: true, notifyDaily: true }).populate('user');
    for (const plan of plans) {
      if (!plan.user || !plan.plan?.length) continue;
      // Auto-advance by calendar: Day N = days since startDate + 1 (capped).
      // Fixes stuck-at-Day-1 when user never marks complete manually.
      if (plan.startDate) {
        const autoDay = Math.min(
          Math.max(1, Math.floor((Date.now() - new Date(plan.startDate).getTime()) / 86400000) + 1),
          plan.plan.length
        );
        if (autoDay > plan.currentDay) {
          plan.currentDay = autoDay;
          await plan.save();
        }
      }
      const dayIndex = Math.min(plan.currentDay, plan.plan.length) - 1;
      const today = plan.plan[dayIndex];
      if (!today) continue;
      // Shared dedup gate with the manual start route — only one path sends per day
      const won = await claimStudyPlanDay(plan.user._id, plan._id, plan.currentDay);
      if (!won) continue;
      const logKey = studyPlanLogKey(plan.currentDay);
      await Notification.create({
        user: plan.user._id,
        type: 'study_plan',
        title: `Day ${plan.currentDay}: ${today.topic}`,
        message: `Today's focus: ${today.topic} (${today.subject}) - ${today.hours}h. Tasks: ${today.tasks?.join(', ')}`,
      });
      if (plan.user.notificationPreferences?.email !== false && plan.user.email) {
        try {
          const { sendEmail } = await import('../config/nodemailer.js');
          await sendEmail({
            to: plan.user.email,
            subject: `Day ${plan.currentDay}: ${today.topic} - Study Plan`,
            html: `<p>Hi ${plan.user.name},</p><p>Today is <strong>Day ${plan.currentDay}</strong> of your ${plan.exam} plan:</p><p><strong>${today.topic}</strong> (${today.subject}) - ${today.hours}h</p><p>Tasks: ${today.tasks?.join(', ')}</p>`,
            text: `Day ${plan.currentDay}: ${today.topic} (${today.subject})`,
          });
          await NotificationLog.updateOne(
            { user: plan.user._id, job: plan._id, notificationType: logKey },
            { method: 'both' }
          );
        } catch (e) { console.error(`[StudyPlan] Email failed for ${plan.user.email}: ${e.message}`); }
      }
      // Advance day for next notification (optional - or keep manual)
      // Auto-advance already handled by calendar above; manual complete-day endpoint also available.
      sent++;
    }
    if (sent > 0) console.log(`[StudyPlan] Sent ${sent} daily notifications`);
    return sent;
  } catch (e) { console.error('[StudyPlan] Check failed', e.message); return sent; }
};

export const sendDailyDigest = async () => {
  console.log('[Digest] Building daily summary...');
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const active = await Job.find({ jobStatus: 'active', verificationStatus: 'verified' }).sort({ applicationEndDate: 1 }).limit(20);
  const closingSoon = active.filter((j) => j.applicationEndDate && new Date(j.applicationEndDate) <= in3Days);
  if (!active.length) return 0;
  const users = await User.find({}).select('_id email notificationPreferences').limit(500);
  let sent = 0;
  // Digest dedup uses Notification itself (no Job to log against), so we
  // directly check recent system notifications per user.
  for (const user of users) {
    const logKey = `daily_digest_${now.toISOString().split('T')[0]}`;
    const already = await Notification.findOne({ user: user._id, type: 'system', title: { $regex: '^Daily digest' }, createdAt: { $gte: new Date(now.toISOString().split('T')[0]) } });
    if (already) continue;
    const lines = active.slice(0, 5).map((j) => `• ${j.title} (Last: ${new Date(j.applicationEndDate).toLocaleDateString('en-IN')})`).join('\n');
    const msg = `${active.length} active jobs today.${closingSoon.length ? ` ${closingSoon.length} closing in 3 days!` : ''}\n${lines}`;
    await Notification.create({
      user: user._id,
      type: 'system',
      title: `Daily digest — ${active.length} open jobs`,
      message: msg,
    });
    sent++;
  }
  console.log(`[Digest] Sent ${sent} digests`);
  return sent;
};

export const runAllNotificationChecks = async () => {
  const deadlines = await checkDeadlines().catch((e) => { console.error('[Reminder] deadlines failed', e.message); return 0; });
  const studyPlans = await checkStudyPlans().catch((e) => { console.error('[StudyPlan] failed', e.message); return 0; });
  const digests = await sendDailyDigest().catch((e) => { console.error('[Digest] failed', e.message); return 0; });
  return { deadlines, studyPlans, digests };
};

export const startReminderCron = (opts = {}) => {
  const tz = { timezone: 'Asia/Kolkata' };
  // NOTE: with `timezone` set, '30 7' means 7:30 AM IST (not UTC).
  // These were previously '30 3'/'30 2'/'0 2' = 2:00–3:30 AM IST, when a
  // free-tier instance is always asleep, so mails silently never fired.
  cron.schedule('30 7 * * *', () => { sendDailyDigest().catch(console.error); }, tz); // 7:30 AM IST digest
  cron.schedule('0 8 * * *', () => { checkStudyPlans().catch(console.error); }, tz); // 8 AM IST study plans
  cron.schedule('0 9 * * *', () => { checkDeadlines().catch(console.error); }, tz); // 9 AM IST deadlines
  console.log('[Reminder] Crons: 7:30 AM digest, 8 AM study plans, 9 AM deadlines IST (Asia/Kolkata)');
  verifySmtpOnBoot();
  if (opts.runOnBoot !== false) {
    // Catch-up: if server was off at cron time, send due mails immediately on boot
    setTimeout(() => runAllNotificationChecks().catch(console.error), 10 * 1000);
  }
};

// Surface the mail reason in Render logs at every boot: SMTP misconfigured,
// Gmail rejecting the app password, or all-good. No more silent no-mail days.
async function verifySmtpOnBoot() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[Email] SMTP NOT configured (SMTP_USER/SMTP_PASS missing) — mails will be mocked/skipped, nothing is really sent');
    return;
  }
  try {
    const { getTransporter } = await import('../config/nodemailer.js');
    await getTransporter().verify();
    console.log(`[Email] SMTP ready via ${process.env.SMTP_HOST || 'smtp.gmail.com'} as ${process.env.SMTP_USER}`);
  } catch (e) {
    console.error(`[Email] SMTP FAILED — no mail can be sent until fixed: ${e.message}`);
  }
}

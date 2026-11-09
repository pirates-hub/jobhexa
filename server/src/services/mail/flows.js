import crypto from 'node:crypto';
import Job from '../../models/Job.js';
import User from '../../models/User.js';
import Notification from '../../models/Notification.js';
import NotificationLog from '../../models/NotificationLog.js';
import SavedJob from '../../models/SavedJob.js';
import Application from '../../models/Application.js';
import StudyPlan from '../../models/StudyPlan.js';
import MailDelivery from '../../models/MailDelivery.js';
import { checkEligibility } from '../eligibility.service.js';
import { makeUnsubscribeToken } from '../../utils/mailToken.js';
import { apiBase, isPaused } from './config.js';
import { isSendableAddress, sendFlowMail, sendMail, shortHash } from './mailer.js';
import {
  adminManual,
  adminTest,
  deadlineReminder,
  eligibleDigest,
  passwordReset,
  preferencesUrl,
  studyPlanDay,
  welcome,
} from './templates.js';

const REMINDER_DAYS = [7, 3, 1, 0];
const MAX_DIGEST_JOBS = 8;

const IST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// YYYY-MM-DD in Asia/Kolkata. Using UTC here would flip the daily key at
// 5:30 AM IST and let a retry send yesterday's digest again.
export const ymdIST = (date = new Date()) => IST_DATE.format(new Date(date));

const startOfISTDay = (date = new Date()) => new Date(`${ymdIST(date)}T00:00:00+05:30`);

const unsubscribeUrlFor = (user) =>
  `${apiBase()}/api/unsubscribe?token=${encodeURIComponent(makeUnsubscribeToken(user._id))}`;

const recurringHeaders = (unsubscribeUrl) => ({
  'List-Unsubscribe': `<${unsubscribeUrl}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
});

const claimNotificationLog = async ({ user, job, type }) => {
  try {
    await NotificationLog.create({
      user,
      job,
      notificationType: type,
      method: 'in_app',
    });
    return true;
  } catch (error) {
    if (error?.code === 11000) return false; // already shown in the app
    throw error;
  }
};

const markNotificationBoth = async ({ user, job, type }) => {
  await NotificationLog.updateOne(
    { user, job, notificationType: type },
    { $set: { method: 'both', sentAt: new Date() } },
    { upsert: true }
  ).catch((e) => console.error('[Mail] notification log update failed:', e.message));
};

const pausedResult = (flow) => ({
  flow,
  sent: 0,
  skipped: 0,
  failed: 0,
  paused: true,
});

export const studyPlanLogKey = (day, date = new Date()) =>
  `studyplan_day_${day}_${ymdIST(date)}`;

// Shared by the 8 AM flow and the "Start plan" route so Day 1 cannot be shown
// twice in the bell when a user restarts a plan on the same day.
export const claimStudyPlanDay = async (userId, planId, day, date = new Date()) => {
  try {
    await NotificationLog.create({
      user: userId,
      job: planId,
      notificationType: studyPlanLogKey(day, date),
      method: 'in_app',
    });
    return true;
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }
};

const studyPlanPeriodKey = (plan, day, date = new Date()) =>
  `plan_${plan._id}_${ymdIST(plan.startDate || date)}_day_${day}`;

export const sendDeadlineEmail = async ({ user, job, daysLeft }) => {
  if (!isSendableAddress(user.email)) {
    return { ok: true, skipped: true, reason: 'no_deliverable_email' };
  }
  if (user.notificationPreferences?.email === false) {
    return { ok: true, skipped: true, reason: 'email_disabled' };
  }
  const unsubscribeUrl = unsubscribeUrlFor(user);
  return sendFlowMail({
    user,
    flow: 'deadline_reminder',
    periodKey: `job_${job._id}_${daysLeft}d`,
    headers: recurringHeaders(unsubscribeUrl),
    template: () => deadlineReminder({
      user,
      job,
      daysLeft,
      unsubscribeUrl,
      preferencesUrl: preferencesUrl(),
    }),
  });
};

export const sendStudyPlanEmail = async ({ user, plan, day, periodKey }) => {
  if (!isSendableAddress(user.email)) {
    return { ok: true, skipped: true, reason: 'no_deliverable_email' };
  }
  if (user.notificationPreferences?.email === false) {
    return { ok: true, skipped: true, reason: 'email_disabled' };
  }
  if (user.notificationPreferences?.studyPlanReminders === false) {
    return { ok: true, skipped: true, reason: 'study_plan_disabled' };
  }
  const unsubscribeUrl = unsubscribeUrlFor(user);
  return sendFlowMail({
    user,
    flow: 'study_plan',
    periodKey: periodKey || studyPlanPeriodKey(plan, day.day),
    headers: recurringHeaders(unsubscribeUrl),
    template: () => studyPlanDay({
      user,
      plan,
      day,
      unsubscribeUrl,
      preferencesUrl: preferencesUrl(),
    }),
  });
};

export const sendEligibleDigest = async () => {
  const flow = 'eligible_digest';
  if (isPaused()) return pausedResult(flow);

  const now = new Date();
  const todayKey = ymdIST(now);
  const dayStart = startOfISTDay(now);

  const [users, jobs] = await Promise.all([
    User.find({
      email: { $exists: true, $ne: '' },
      'notificationPreferences.email': { $ne: false },
      'notificationPreferences.newJobs': { $ne: false },
    })
      .select('name email qualification dateOfBirth state district category preferredExamTypes notificationPreferences')
      .limit(2000)
      .lean(),
    Job.find({
      jobStatus: { $in: ['active', 'closing_soon'] },
      verificationStatus: 'verified',
      $or: [
        { applicationEndDate: { $gte: now } },
        { applicationEndDate: null },
        { applicationEndDate: { $exists: false } },
      ],
    })
      .sort({ applicationEndDate: 1 })
      .limit(150)
      .lean(),
  ]);

  const result = { flow, sent: 0, skipped: 0, failed: 0, noMatches: 0, incompleteProfiles: 0, total: users.length };
  if (!users.length || !jobs.length) {
    console.log(`[Mail] ${flow}: ${users.length} users, ${jobs.length} jobs — nothing to do`);
    return result;
  }

  for (const user of users) {
    const matches = [];
    let incomplete = false;

    for (const job of jobs) {
      try {
        const eligibility = checkEligibility(user, job);
        if (eligibility?.incompleteProfile) {
          incomplete = true;
          break;
        }
        if (eligibility?.eligible === true) {
          matches.push({ job, score: eligibility.score || 0 });
        }
      } catch (error) {
        console.error(`[Mail] eligibility failed for job ${job._id}: ${error.message}`);
      }
    }

    if (incomplete) {
      result.incompleteProfiles += 1;
      result.skipped += 1;
      continue;
    }

    if (!matches.length) {
      result.noMatches += 1;
      result.skipped += 1;
      continue;
    }

    matches.sort((a, b) => b.score - a.score
      || new Date(a.job.applicationEndDate || 0) - new Date(b.job.applicationEndDate || 0));
    const selected = matches.slice(0, MAX_DIGEST_JOBS).map((entry) => entry.job);

    // Keep the in-app bell independent of email so a provider outage does not
    // hide the jobs inside the app. One bell entry per user per day.
    try {
      const already = await Notification.exists({
        user: user._id,
        type: 'system',
        title: { $regex: '^You are eligible' },
        createdAt: { $gte: dayStart },
      });
      if (!already) {
        const lines = selected.map((job, index) => {
          const lastDate = job.applicationEndDate
            ? new Date(job.applicationEndDate).toLocaleDateString('en-IN')
            : 'Not specified';
          return `${index + 1}. ${job.title} — last date: ${lastDate}`;
        }).join('\n');
        await Notification.create({
          user: user._id,
          type: 'system',
          title: `You are eligible for ${selected.length} job(s) today`,
          message: `You are eligible for these ${selected.length} job(s) today:\n${lines}`,
        });
      }
    } catch (error) {
      console.error(`[Mail] eligible in-app notification failed: ${error.message}`);
    }

    try {
      const unsubscribeUrl = unsubscribeUrlFor(user);
      const mail = await sendFlowMail({
        user,
        flow,
        periodKey: todayKey,
        headers: recurringHeaders(unsubscribeUrl),
        template: () => eligibleDigest({
          user,
          jobs: selected,
          unsubscribeUrl,
          preferencesUrl: preferencesUrl(),
        }),
      });
      if (mail.skipped) result.skipped += 1;
      else result.sent += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`[Mail] eligible digest failed for ${user.email}: ${error.message}`);
    }
  }

  console.log(`[Mail] ${flow}: sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`);
  return result;
};

export const checkDeadlines = async () => {
  const flow = 'deadline_reminder';
  if (isPaused()) return pausedResult(flow);

  const now = new Date();
  const dayStart = startOfISTDay(now);
  const jobs = await Job.find({
    jobStatus: { $in: ['active', 'closing_soon'] },
    verificationStatus: 'verified',
    applicationEndDate: { $gte: dayStart },
  })
    .sort({ applicationEndDate: 1 })
    .limit(500)
    .lean();

  const due = jobs
    .map((job) => ({
      job,
      daysLeft: Math.round((startOfISTDay(job.applicationEndDate) - dayStart) / 86400000),
    }))
    .filter((entry) => REMINDER_DAYS.includes(entry.daysLeft));

  const result = { flow, sent: 0, skipped: 0, failed: 0, notifications: 0, jobs: due.length };
  if (!due.length) {
    console.log(`[Mail] ${flow}: no jobs at 7/3/1/0 days`);
    return result;
  }

  const jobIds = due.map((entry) => entry.job._id);
  const [saved, applied] = await Promise.all([
    SavedJob.find({ job: { $in: jobIds } }).select('job user').lean(),
    Application.find({ job: { $in: jobIds }, status: { $ne: 'withdrawn' } }).select('job user').lean(),
  ]);

  const audience = new Map();
  for (const row of [...saved, ...applied]) {
    const key = String(row.job);
    if (!audience.has(key)) audience.set(key, new Set());
    audience.get(key).add(String(row.user));
  }

  const userIds = new Set();
  for (const set of audience.values()) {
    for (const id of set) userIds.add(id);
  }
  if (!userIds.size) {
    console.log(`[Mail] ${flow}: no users tracking the due jobs`);
    return result;
  }

  const users = await User.find({
    _id: { $in: [...userIds] },
    'notificationPreferences.deadlineReminders': { $ne: false },
  })
    .select('name email notificationPreferences')
    .lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));

  for (const { job, daysLeft } of due) {
    const ids = audience.get(String(job._id)) || new Set();
    for (const id of ids) {
      const user = byId.get(String(id));
      if (!user) continue;

      const type = daysLeft === 0 ? 'deadline_today' : `deadline_${daysLeft}day`;
      try {
        const claimed = await claimNotificationLog({ user: user._id, job: job._id, type });
        if (claimed) {
          await Notification.create({
            user: user._id,
            type,
            title: `Deadline: ${job.title}`,
            message: `${daysLeft === 0 ? 'Today is the last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`} to apply for ${job.title}`,
            jobId: job._id,
          });
          result.notifications += 1;
        }
      } catch (error) {
        console.error(`[Mail] deadline in-app notification failed: ${error.message}`);
      }

      try {
        const mail = await sendDeadlineEmail({ user, job, daysLeft });
        if (mail.skipped) {
          result.skipped += 1;
        } else {
          result.sent += 1;
          await markNotificationBoth({ user: user._id, job: job._id, type });
        }
      } catch (error) {
        result.failed += 1;
        console.error(`[Mail] deadline failed for ${user.email} / ${job.title}: ${error.message}`);
      }
    }
  }

  console.log(`[Mail] ${flow}: sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`);
  return result;
};

export const checkStudyPlans = async () => {
  const flow = 'study_plan';
  if (isPaused()) return pausedResult(flow);

  const plans = await StudyPlan.find({ isActive: true, notifyDaily: true }).populate('user');
  const result = { flow, sent: 0, skipped: 0, failed: 0, notifications: 0, total: plans.length };

  for (const plan of plans) {
    const user = plan.user;
    if (!user || !plan.plan?.length) {
      result.skipped += 1;
      continue;
    }

    // Calendar-based day: a user who never marks a day complete still moves
    // forward instead of receiving Day 1 forever.
    try {
      if (plan.startDate) {
        // Calendar days in IST, not elapsed 24-hour windows: a plan started at
        // 10 PM must move to Day 2 at the next 8 AM run, not wait until 10 PM.
        const elapsedDays = Math.round(
          (startOfISTDay(new Date()) - startOfISTDay(plan.startDate)) / 86400000
        );
        const autoDay = Math.min(Math.max(1, elapsedDays + 1), plan.plan.length);
        if (autoDay > plan.currentDay) {
          plan.currentDay = autoDay;
          await plan.save();
        }
      }
    } catch (error) {
      console.error(`[Mail] study-plan day advance failed: ${error.message}`);
    }

    const dayNumber = Math.min(plan.currentDay, plan.plan.length);
    const day = plan.plan[dayNumber - 1];
    if (!day) {
      result.skipped += 1;
      continue;
    }

    try {
      const claimed = await claimStudyPlanDay(user._id, plan._id, dayNumber);
      if (claimed) {
        await Notification.create({
          user: user._id,
          type: 'study_plan',
          title: `Day ${dayNumber}: ${day.topic}`,
          message: `Today's focus: ${day.topic} (${day.subject || 'General'}) — ${day.hours || 2}h. Tasks: ${(day.tasks || []).join(', ') || 'Revise today’s topic'}`,
        });
        result.notifications += 1;
      }
    } catch (error) {
      console.error(`[Mail] study-plan in-app notification failed: ${error.message}`);
    }

    try {
      const mail = await sendStudyPlanEmail({
        user,
        plan,
        day,
        periodKey: studyPlanPeriodKey(plan, dayNumber),
      });
      if (mail.skipped) {
        result.skipped += 1;
      } else {
        result.sent += 1;
        await markNotificationBoth({
          user: user._id,
          job: plan._id,
          type: studyPlanLogKey(dayNumber),
        });
      }
    } catch (error) {
      result.failed += 1;
      console.error(`[Mail] study-plan failed for ${user.email}: ${error.message}`);
    }
  }

  console.log(`[Mail] ${flow}: sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`);
  return result;
};

export const sendWelcomeEmail = async (user) => {
  if (!user?.email) return { ok: true, skipped: true, reason: 'no_email' };
  if (user.notificationPreferences?.email === false) {
    return { ok: true, skipped: true, reason: 'email_disabled' };
  }
  return sendFlowMail({
    user,
    flow: 'welcome',
    periodKey: 'welcome',
    template: () => welcome({ user, preferencesUrl: preferencesUrl() }),
  });
};

// A signup can happen while the provider is down. Retry recent failed welcome
// rows on boot instead of losing the account email forever.
export const retryFailedWelcomes = async () => {
  const flow = 'welcome_retry';
  if (isPaused()) return pausedResult(flow);

  const rows = await MailDelivery.find({
    flow: 'welcome',
    status: 'failed',
    createdAt: { $gte: new Date(Date.now() - 14 * 86400000) },
  })
    .sort({ updatedAt: 1 })
    .limit(25)
    .populate('user');

  const result = { flow, sent: 0, skipped: 0, failed: 0, total: rows.length };
  for (const row of rows) {
    if (!row.user) {
      result.skipped += 1;
      continue;
    }
    try {
      const mail = await sendWelcomeEmail(row.user);
      if (mail.skipped) result.skipped += 1;
      else result.sent += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`[Mail] welcome retry failed: ${error.message}`);
    }
  }
  if (rows.length) console.log(`[Mail] ${flow}: sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`);
  return result;
};

export const sendPasswordResetEmail = async (user, { token, link }) => {
  if (!token || !link) throw new Error('reset token and link are required');
  return sendFlowMail({
    user,
    flow: 'password_reset',
    periodKey: `reset_${shortHash(token)}`,
    template: () => passwordReset({
      user,
      link,
      expiresMinutes: 10,
      preferencesUrl: preferencesUrl(),
    }),
  });
};

export const sendAdminTest = async ({ to, name }) => {
  const content = adminTest({ name });
  return sendMail({
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    flow: 'admin_test',
  });
};

export const sendAdminManual = async ({ recipients, subject, message, html }) => {
  if (!subject) throw new Error('subject is required');
  if (!message && !html) throw new Error('message or html is required');

  const result = { sent: 0, total: recipients.length, errors: [], deliveredUserIds: [] };
  for (const recipient of recipients) {
    if (!recipient.email || !isSendableAddress(recipient.email)) {
      result.errors.push(`${recipient.email || recipient._id || '(no email)'}: not a deliverable address`);
      continue;
    }

    try {
      const unsubscribeUrl = recipient._id ? unsubscribeUrlFor(recipient) : null;
      const content = adminManual({
        name: recipient.name,
        message,
        html,
        unsubscribeUrl,
        preferencesUrl: preferencesUrl(),
      });
      await sendMail({
        to: recipient.email,
        subject,
        html: content.html,
        text: content.text,
        headers: unsubscribeUrl ? recurringHeaders(unsubscribeUrl) : {},
        flow: 'admin_manual',
        userId: recipient._id,
      });
      result.sent += 1;
      if (recipient._id) result.deliveredUserIds.push(recipient._id);
    } catch (error) {
      result.errors.push(`${recipient.email}: ${error.message}`);
    }
  }
  return result;
};

export const runAllFlows = async () => {
  const results = {};
  for (const [name, run] of [
    ['deadline_reminder', checkDeadlines],
    ['study_plan', checkStudyPlans],
    ['eligible_digest', sendEligibleDigest],
    ['welcome_retry', retryFailedWelcomes],
  ]) {
    try {
      results[name] = await run();
    } catch (error) {
      console.error(`[Mail] ${name} failed: ${error.message}`);
      results[name] = { flow: name, sent: 0, skipped: 0, failed: 0, error: error.message };
    }
  }
  return results;
};

const FLOW_ALIASES = {
  eligible: 'eligible_digest',
  digest: 'eligible_digest',
  eligible_digest: 'eligible_digest',
  deadlines: 'deadline_reminder',
  deadline: 'deadline_reminder',
  deadline_reminder: 'deadline_reminder',
  study: 'study_plan',
  study_plan: 'study_plan',
  studyplan: 'study_plan',
};

export const runFlow = async (name) => {
  const flow = FLOW_ALIASES[String(name || '').toLowerCase()];
  if (!flow) return null;
  if (flow === 'eligible_digest') return sendEligibleDigest();
  if (flow === 'deadline_reminder') return checkDeadlines();
  return checkStudyPlans();
};

export const hashResetToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

import Job from '../models/Job.js';
import User from '../models/User.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import Notification from '../models/Notification.js';
import NotificationLog from '../models/NotificationLog.js';
import MailDelivery from '../models/MailDelivery.js';
import MailAttempt from '../models/MailAttempt.js';
import slugify from 'slugify';
import {
  getMailStatus as buildMailStatus,
  runFlow,
  sendAdminManual,
  sendAdminTest,
} from '../services/mail/index.js';
import { notifyNewJobTelegram } from '../services/telegram.service.js';

const logAction = async (adminId, action, targetType, targetId, details, ip) => {
  await AdminAuditLog.create({ admin: adminId, action, targetType, targetId, details, ipAddress: ip });
};

// In-app bell entry for every opted-in user (fast; does not block on email).
const pushInAppAlert = async (job) => {
  const users = await User.find({ 'notificationPreferences.newJobs': { $ne: false } }).select('_id').limit(2000);
  if (!users.length) return 0;
  const docs = users.map((u) => ({
    user: u._id,
    type: 'new_job',
    title: `New job: ${job.title}`,
    message: `${job.organization} — ${job.totalVacancies || ''} posts. Last date: ${job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString('en-IN') : 'see notification'}. Tap to view.`,
    jobId: job._id,
  }));
  await Notification.insertMany(docs, { ordered: false });
  return docs.length;
};

export const getDashboardStats = async (req, res) => {
  const [totalJobs, pendingJobs, totalUsers, activeJobs] = await Promise.all([
    Job.countDocuments(),
    Job.countDocuments({ verificationStatus: 'pending' }),
    User.countDocuments({ role: 'user' }),
    Job.countDocuments({ jobStatus: 'active' }),
  ]);
  res.json({ success: true, data: { totalJobs, pendingJobs, totalUsers, activeJobs } });
};

export const getAllJobsAdmin = async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: { jobs } });
};

export const getPendingJobs = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const [jobs, total] = await Promise.all([
    Job.find({ verificationStatus: 'pending' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Job.countDocuments({ verificationStatus: 'pending' }),
  ]);
  res.json({
    success: true,
    data: { jobs, total, page, limit, pages: Math.ceil(total / limit) || 1 },
  });
};

export const verifyJob = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  const newlyPublished = job.verificationStatus !== 'verified';
  job.verificationStatus = 'verified';
  job.verifiedBy = req.user._id;
  job.verificationDate = new Date();
  await job.save();
  await logAction(req.user._id, 'verify_job', 'Job', job._id, {}, req.ip);
  if (!newlyPublished) return res.json({ success: true, data: { job } });
  // In-app bell + Telegram only. The instant email fan-out was dropped in the
  // mail rebuild: the daily eligible digest covers new jobs without burning
  // provider quota on every approval.
  try {
    await pushInAppAlert(job);
  } catch (e) { console.error('[Notify] in-app verify alert failed', e.message); }
  notifyNewJobTelegram(job);
  res.json({ success: true, data: { job } });
};

export const rejectJob = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  job.verificationStatus = 'rejected';
  job.verificationNotes = req.body.reason || '';
  await job.save();
  await logAction(req.user._id, 'reject_job', 'Job', job._id, { reason: req.body.reason }, req.ip);
  res.json({ success: true, data: { job } });
};

export const createJob = async (req, res) => {
  const job = await Job.create({ ...req.body, source: 'admin', verificationStatus: 'verified', verifiedBy: req.user._id });
  await logAction(req.user._id, 'create_job', 'Job', job._id, {}, req.ip);
  try {
    await pushInAppAlert(job);
  } catch (e) { console.error('[Notify] in-app create alert failed', e.message); }
  res.status(201).json({ success: true, data: { job } });
};

export const updateJob = async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  await logAction(req.user._id, 'update_job', 'Job', job._id, req.body, req.ip);
  res.json({ success: true, data: { job } });
};

export const deleteJob = async (req, res) => {
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  await logAction(req.user._id, 'delete_job', 'Job', job._id, {}, req.ip);
  res.json({ success: true, data: { message: 'Job deleted' } });
};

export const getAllUsers = async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: { users } });
};

export const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  await logAction(req.user._id, 'delete_user', 'User', req.params.id, {}, req.ip);
  res.json({ success: true, data: { message: 'User deleted' } });
};

export const getAuditLogs = async (req, res) => {
  const logs = await AdminAuditLog.find().populate('admin', 'name email').sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: { logs } });
};

// All-in-one overview for admin portal separate section
export const getOverview = async (req, res) => {
  const [totalJobs, pendingJobs, activeJobs, totalUsers, mailTotal, notifCount, videoCount] = await Promise.all([
    Job.countDocuments(),
    Job.countDocuments({ verificationStatus: 'pending' }),
    Job.countDocuments({ jobStatus: 'active' }),
    User.countDocuments({ role: 'user' }),
    NotificationLog.countDocuments(),
    Notification.countDocuments(),
    (await import('../models/VideoLink.js')).default.countDocuments(),
  ]);
  const [recentMails, recentNotifs, recentAudits, recentRuns] = await Promise.all([
    NotificationLog.find().populate('user', 'name email').populate('job', 'title').sort({ createdAt: -1 }).limit(10),
    Notification.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10),
    AdminAuditLog.find().populate('admin', 'name email').sort({ createdAt: -1 }).limit(10),
    (await import('../models/CollectionRun.js')).default.find().sort({ createdAt: -1 }).limit(10),
  ]);
  const byMethod = await NotificationLog.aggregate([{ $group: { _id: '$method', count: { $sum: 1 } } }]);
  const crons = [
    { name: 'Eligible-jobs mail', schedule: '0 7 * * *', ist: '7 AM IST daily' },
    { name: 'Eligible-jobs retry', schedule: '45 7 * * *', ist: '7:45 AM IST daily' },
    { name: 'Study plans', schedule: '0 8 * * *', ist: '8 AM IST daily' },
    { name: 'Deadline reminders (7/3/1/0)', schedule: '0 9 * * *', ist: '9 AM IST daily' },
    { name: 'Job status updater', schedule: '30 0 * * *', ist: '6 AM IST daily' },
    { name: 'Daily collection', schedule: '0 2 * * *', ist: '7:30 AM IST daily' },
    { name: 'Weekly state-wise refresh', schedule: '0 1 * * 0', ist: '7 AM IST every Sunday' },
    { name: 'Monthly reconciliation', schedule: '15 2 1 * *', ist: '7:45 AM IST, 1st of month' },
  ];
  res.json({ success: true, data: { stats: { totalJobs, pendingJobs, activeJobs, totalUsers, mailTotal, notifCount, videoCount }, byMethod, recentMails, recentNotifs, recentAudits, recentRuns, crons } });
};

// Crawl history + error logs for admin portal
export const getCrawlHistory = async (req, res) => {
  const { default: CollectionRun } = await import('../models/CollectionRun.js');
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const [runs, total] = await Promise.all([
    CollectionRun.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    CollectionRun.countDocuments(),
  ]);
  res.json({ success: true, data: { runs, total, page, limit } });
};

// Admin: create preparation topic(s) — idempotent by slug.
// Accepts a single body or { topics: [...] } for bulk creation.
export const createTopic = async (req, res) => {
  try {
    const { default: Subject } = await import('../models/Subject.js');
    const { default: Topic } = await import('../models/Topic.js');
    const list = Array.isArray(req.body?.topics) ? req.body.topics : [req.body];
    const created = [];
    const skipped = [];
    for (const item of list) {
      const { name, slug, subjectName, subjectSlug, description, difficulty, estimatedHours } = item || {};
      if (!name) { skipped.push('(missing name)'); continue; }
      const subject = subjectSlug
        ? await Subject.findOne({ slug: subjectSlug })
        : await Subject.findOne({ name: new RegExp(`^${String(subjectName || '').trim()}$`, 'i') });
      if (!subject) { skipped.push(`${name} (subject not found)`); continue; }
      const finalSlug = slug || slugify(name, { lower: true, strict: true });
      const exists = await Topic.findOne({ slug: finalSlug });
      if (exists) { skipped.push(`${name} (already exists)`); continue; }
      const topic = await Topic.create({
        name, slug: finalSlug, subject: subject._id,
        description: description || '', difficulty: difficulty || 'medium', estimatedHours: estimatedHours || 2,
      });
      created.push({ name, slug: finalSlug });
    }
    await logAction(req.user._id, 'create_topic', 'Topic', null, { created: created.length, skipped: skipped.length }, req.ip);
    res.json({ success: true, data: { created, skipped } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Admin: attach a YouTube video to a preparation topic (idempotent by videoId).
// Accepts a full watch URL — the 11-char id is extracted server-side.
export const addVideo = async (req, res) => {
  try {
    const { default: Topic } = await import('../models/Topic.js');
    const { default: VideoLink } = await import('../models/VideoLink.js');
    const { topicSlug, topicName, title, youtubeUrl, youtubeVideoId, channelName, language, quality } = req.body;
    let topic = null;
    if (topicSlug) topic = await Topic.findOne({ slug: topicSlug });
    if (!topic && topicName) topic = await Topic.findOne({ name: new RegExp(`^${String(topicName).trim()}$`, 'i') });
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found — check topicSlug/topicName' });
    let videoId = youtubeVideoId;
    if (!videoId && youtubeUrl) {
      const m = String(youtubeUrl).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      videoId = m?.[1] || null;
    }
    if (!videoId) return res.status(400).json({ success: false, message: 'Provide a valid YouTube watch URL or 11-char videoId' });
    const exists = await VideoLink.findOne({ youtubeVideoId: videoId });
    if (exists) return res.json({ success: true, data: { video: exists, message: 'Video already attached' } });
    const video = await VideoLink.create({
      topic: topic._id,
      title: title || topic.name,
      youtubeVideoId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      channelName: channelName || '', language: language || 'english',
      quality: quality || 'beginner', isVerified: true,
    });
    await logAction(req.user._id, 'add_video', 'VideoLink', video._id, { topic: topic.slug, videoId }, req.ip);
    res.json({ success: true, data: { video } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Latest logical deliveries + raw provider attempts. The Admin > Mails page
// uses /mails/status for the aggregate view; this endpoint keeps pagination.
export const getMailLogs = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const [deliveries, deliveryTotal, attempts, attemptTotal] = await Promise.all([
    MailDelivery.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MailDelivery.countDocuments(),
    MailAttempt.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    MailAttempt.countDocuments(),
  ]);
  res.json({
    success: true,
    data: { deliveries, deliveryTotal, attempts, attemptTotal, page, limit },
  });
};

export const getMailStatus = async (req, res) => {
  try {
    const status = await buildMailStatus();
    res.json({ success: true, data: status });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const sendTestMail = async (req, res) => {
  const to = req.body?.to || req.user?.email;
  if (!to) return res.status(400).json({ success: false, message: 'Recipient email is required' });
  try {
    const result = await sendAdminTest({ to, name: req.user?.name });
    res.json({ success: true, data: { ...result, to } });
  } catch (e) {
    res.status(502).json({ success: false, message: e.message });
  }
};

export const runMailFlow = async (req, res) => {
  try {
    const result = await runFlow(req.params.flow);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Unknown flow. Use eligible_digest, deadline_reminder or study_plan.',
      });
    }
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// Admin manual mail send
export const sendManualMail = async (req, res) => {
  const { to, subject, message, html, userIds } = req.body;
  if (!subject || (!message && !html)) {
    return res.status(400).json({ success: false, message: 'subject and message/html required' });
  }
  let recipients = [];
  if (Array.isArray(userIds) && userIds.length) {
    recipients = await User.find({ _id: { $in: userIds } }).select('email name');
  } else if (to === 'all') {
    recipients = await User.find({}).select('email name');
  } else if (typeof to === 'string' && to.includes('@')) {
    // comma-separated emails
    const emails = to.split(',').map((s) => s.trim()).filter(Boolean);
    recipients = emails.map((e) => ({ email: e, name: e }));
  } else if (Array.isArray(to) && to.length) {
    recipients = to.map((e) => ({ email: String(e).trim(), name: String(e).trim() }));
  } else {
    return res.status(400).json({ success: false, message: 'Provide to: "all", email, or userIds[]' });
  }
  if (!recipients.length) return res.status(404).json({ success: false, message: 'No recipients found' });

  const result = await sendAdminManual({ recipients, subject, message, html });

  // Keep the in-app bell in sync with successfully delivered mails.
  if (result.deliveredUserIds.length) {
    const docs = result.deliveredUserIds.map((id) => ({
      user: id,
      type: 'system',
      title: subject,
      message: message || 'Admin message — check email',
    }));
    await Notification.insertMany(docs, { ordered: false }).catch((e) => {
      console.error('[Admin] manual-mail in-app notification failed:', e.message);
    });
  }

  await logAction(
    req.user._id,
    'manual_mail',
    'User',
    null,
    {
      to: typeof to === 'string' ? to : `${recipients.length} users`,
      subject,
      sent: result.sent,
      errs: result.errors.slice(0, 5),
    },
    req.ip
  );
  res.json({ success: true, data: result });
};

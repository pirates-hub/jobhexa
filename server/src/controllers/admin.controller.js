import Job from '../models/Job.js';
import User from '../models/User.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import Notification from '../models/Notification.js';
import NotificationLog from '../models/NotificationLog.js';
import { sendEmail } from '../config/nodemailer.js';
import { notifyNewJobTelegram } from '../services/telegram.service.js';

const logAction = async (adminId, action, targetType, targetId, details, ip) => {
  await AdminAuditLog.create({ admin: adminId, action, targetType, targetId, details, ipAddress: ip });
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
  const jobs = await Job.find({ verificationStatus: 'pending' }).sort({ createdAt: -1 });
  res.json({ success: true, data: { jobs } });
};

export const verifyJob = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  job.verificationStatus = 'verified';
  job.verifiedBy = req.user._id;
  job.verificationDate = new Date();
  await job.save();
  await logAction(req.user._id, 'verify_job', 'Job', job._id, {}, req.ip);
  // INSTANT new-job alert — the second a job is verified (opted-in users only)
  try {
    const users = await User.find({ 'notificationPreferences.newJobs': { $ne: false } }).select('_id').limit(2000);
    if (users.length) {
      const docs = users.map((u) => ({
        user: u._id,
        type: 'new_job',
        title: `New job: ${job.title}`,
        message: `${job.organization} — ${job.totalVacancies || ''} posts. Last date: ${job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString('en-IN') : 'see notification'}. Tap to view.`,
        jobId: job._id,
      }));
      await Notification.insertMany(docs, { ordered: false });
    }
  } catch (e) { console.error('[Notify] instant verify failed', e.message); }
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
    const users = await User.find({ 'notificationPreferences.newJobs': { $ne: false } }).select('_id').limit(2000);
    if (users.length) {
      const docs = users.map((u) => ({
        user: u._id,
        type: 'new_job',
        title: `New job: ${job.title}`,
        message: `${job.organization} — Last date: ${job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString('en-IN') : 'see notification'}.`,
        jobId: job._id,
      }));
      await Notification.insertMany(docs, { ordered: false });
    }
  } catch (e) { console.error('[Notify] instant create failed', e.message); }
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
    { name: 'Daily digest', schedule: '0 2 * * *', ist: '7:30 AM IST daily' },
    { name: 'Study plans', schedule: '30 2 * * *', ist: '8 AM IST daily' },
    { name: 'Deadline reminders (7/3/1/0)', schedule: '30 3 * * *', ist: '9 AM IST daily' },
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

// How mails were sent — unified log for admin panel
export const getMailLogs = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const [logs, total, notifCount] = await Promise.all([
    NotificationLog.find().populate('user', 'name email').populate('job', 'title slug').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    NotificationLog.countDocuments(),
    Notification.countDocuments(),
  ]);
  res.json({ success: true, data: { logs, total, notifCount, page, limit } });
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
    return res.status(400).json({ success: false, message: 'Provide to: \"all\", email, or userIds[]' });
  }
  if (!recipients.length) return res.status(404).json({ success: false, message: 'No recipients found' });

  let sent = 0;
  const errs = [];
  for (const r of recipients) {
    if (!r.email || !r.email.includes('@')) { errs.push(`${r.email || r._id}: invalid email`); continue; }
    try {
      await sendEmail({
        to: r.email,
        subject,
        html: html || `<p>${String(message).replace(/\n/g, '<br>')}</p>`,
        text: message || html?.replace(/<[^>]+>/g, ' '),
      });
      // Also create in-app notification so it shows in bell
      if (r._id) {
        await Notification.create({
          user: r._id,
          type: 'system',
          title: subject,
          message: message || 'Admin message — check email',
        });
      }
      sent++;
    } catch (e) { errs.push(`${r.email}: ${e.message}`); }
  }
  await logAction(req.user._id, 'manual_mail', 'User', null, { to: typeof to === 'string' ? to : `${recipients.length} users`, subject, sent, errs: errs.slice(0, 5) }, req.ip);
  res.json({ success: true, data: { sent, total: recipients.length, errors: errs } });
};

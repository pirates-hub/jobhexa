import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import { updateJobStatuses } from '../services/jobUpdate.service.js';
import { runDailyCollection, runMonthlyReconciliation } from '../services/jobCollection.service.js';
const router = Router();
router.use(protect, adminOnly);
router.post('/jobs/update-statuses', async (req, res) => {
  try {
    const count = await updateJobStatuses();
    res.json({ success: true, data: { updated: count } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.post('/jobs/fetch-current', async (req, res) => {
  try {
    // Manual admin-triggered daily collection. Finds only new/changed
    // documents; everything created lands as pending for verification.
    const results = await runDailyCollection({ sources: req.body?.sources || null });
    const created = results.reduce((n, r) => n + (r.jobsCreated || 0), 0);
    res.json({ success: true, data: { created, results, message: `${created} new job(s) quarantined as pending for verification` } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.post('/jobs/reconcile', async (req, res) => {
  try {
    // Manual admin-triggered monthly reconciliation.
    const stats = await runMonthlyReconciliation();
    res.json({ success: true, data: { stats, message: 'Monthly reconciliation complete' } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.post('/jobs/weekly-refresh', async (req, res) => {
  try {
    const { runWeeklyStateRefresh } = await import('../services/jobCollection.service.js');
    const stats = await runWeeklyStateRefresh();
    res.json({ success: true, data: { stats, message: `Weekly refresh: ${stats.checked} jobs across ${stats.states} states` } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.get('/dashboard', adminCtrl.getDashboardStats);
router.get('/overview', adminCtrl.getOverview);
router.post('/notify/run', async (req, res) => {
  try {
    const { runAllNotificationChecks } = await import('../services/reminder.service.js');
    const result = await runAllNotificationChecks();
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.get('/jobs', adminCtrl.getAllJobsAdmin);
router.get('/jobs/pending', adminCtrl.getPendingJobs);
router.post('/jobs', adminCtrl.createJob);
router.put('/jobs/:id', adminCtrl.updateJob);
router.delete('/jobs/:id', adminCtrl.deleteJob);
router.patch('/jobs/:id/verify', adminCtrl.verifyJob);
router.patch('/jobs/:id/reject', adminCtrl.rejectJob);
router.get('/users', adminCtrl.getAllUsers);
router.delete('/users/:id', adminCtrl.deleteUser);
router.get('/audit-logs', adminCtrl.getAuditLogs);
router.get('/crawls', adminCtrl.getCrawlHistory);
router.get('/mails/logs', adminCtrl.getMailLogs);
router.post('/mails/send', adminCtrl.sendManualMail);
export default router;

import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { chatWithAI, summarizePdf, generateStudyPlan, generateInterviewQuestions } from '../services/ai.service.js';
const router = Router();
router.post('/', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });
    const result = await chatWithAI(message, req.user);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/summarize-pdf', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text required' });
    const result = await summarizePdf(text);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/study-plan', protect, async (req, res) => {
  try {
    const { exam, days } = req.body;
    const numDays = Math.min(Math.max(parseInt(days) || 30, 1), 90);
    const plan = await generateStudyPlan(exam || 'SSC CGL', req.user, [], numDays);
    const planArray = Array.isArray(plan) ? plan : plan.plan || [];
    // Never report success while saving an empty plan
    if (!planArray.length) {
      return res.status(502).json({ success: false, message: plan?.error ? `Plan generation failed: ${plan.error}` : 'Plan generation returned no days — try again' });
    }
    // Save for daily notifications
    try {
      const StudyPlan = (await import('../models/StudyPlan.js')).default;
      await StudyPlan.updateOne(
        { user: req.user._id, isActive: true },
        { user: req.user._id, exam: exam || 'SSC CGL', plan: planArray, startDate: new Date(), currentDay: 1, notifyDaily: true, isActive: true },
        { upsert: true }
      );
    } catch (e) { console.error('Save plan failed', e.message); }
    res.json({ success: true, data: { plan: planArray } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.get('/study-plan', protect, async (req, res) => {
  try {
    const StudyPlan = (await import('../models/StudyPlan.js')).default;
    const plan = await StudyPlan.findOne({ user: req.user._id, isActive: true }).sort({ updatedAt: -1 });
    if (!plan) return res.json({ success: true, data: { plan: null } });
    res.json({ success: true, data: { plan } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/study-plan/start', protect, async (req, res) => {
  try {
    const StudyPlan = (await import('../models/StudyPlan.js')).default;
    const plan = await StudyPlan.findOne({ user: req.user._id, isActive: true });
    if (!plan) return res.status(404).json({ success: false, message: 'No active plan found. Create a plan first.' });
    plan.startDate = new Date();
    plan.currentDay = 1;
    plan.notifyDaily = true;
    await plan.save();
    const today = plan.plan[0];
    if (today) {
      const { claimStudyPlanDay, studyPlanLogKey } = await import('../services/reminder.service.js');
      const Notification = (await import('../models/Notification.js')).default;
      const NotificationLog = (await import('../models/NotificationLog.js')).default;
      // Shared dedup gate with the scheduled job — restarting twice in one day sends once
      const won = await claimStudyPlanDay(req.user._id, plan._id, 1);
      if (won) {
        await Notification.create({ user: req.user._id, type: 'study_plan', title: `Day 1 Started: ${today.topic}`, message: `Your ${plan.exam} plan started! Today: ${today.topic} (${today.subject}) - ${today.hours}h` });
        // Email for Day 1
        try {
          const { sendEmail } = await import('../config/nodemailer.js');
          if (plan.user && req.user.email && req.user.notificationPreferences?.email !== false) {
            await sendEmail({
              to: req.user.email,
              subject: `Day 1 Started: ${today.topic} - ${plan.exam}`,
              html: `<p>Hi ${req.user.name},</p><p>Your <strong>${plan.exam}</strong> plan started!</p><p><strong>Day 1:</strong> ${today.topic} (${today.subject}) - ${today.hours}h</p><p>Tasks: ${today.tasks?.join(', ')}</p><p>Daily notifications at 8 AM IST enabled.</p>`,
              text: `Day 1: ${today.topic} (${today.subject})`,
            });
            await NotificationLog.updateOne(
              { user: req.user._id, job: plan._id, notificationType: studyPlanLogKey(1) },
              { method: 'both' }
            );
          }
        } catch (e) { console.error('Start email failed', e.message); }
      }
    }
    res.json({ success: true, data: { message: 'Plan started! Daily notifications at 8 AM from Day 1.', plan } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/study-plan/complete-day', protect, async (req, res) => {
  try {
    const StudyPlan = (await import('../models/StudyPlan.js')).default;
    const plan = await StudyPlan.findOne({ user: req.user._id, isActive: true });
    if (!plan) return res.status(404).json({ success: false, message: 'No active plan' });
    plan.currentDay = Math.min(plan.currentDay + 1, plan.plan.length || 90);
    await plan.save();
    res.json({ success: true, data: { currentDay: plan.currentDay, plan } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/study-plan', protect, async (req, res) => {
  try {
    const StudyPlan = (await import('../models/StudyPlan.js')).default;
    await StudyPlan.updateOne({ user: req.user._id, isActive: true }, { isActive: false });
    res.json({ success: true, data: { message: 'Plan removed' } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/interview', protect, async (req, res) => {
  try {
    const { jobTitle } = req.body;
    const questions = await generateInterviewQuestions(jobTitle || 'SSC CGL', req.user);
    res.json({ success: true, data: { questions } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
export default router;

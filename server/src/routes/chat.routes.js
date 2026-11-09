import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { chatWithAI, summarizePdf, generateStudyPlan, generateInterviewQuestions } from '../services/ai.service.js';
import { claimStudyPlanDay, sendStudyPlanEmail, studyPlanLogKey } from '../services/mail/flows.js';
const router = Router();
router.post('/', protect, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });
    // Last few turns so follow-ups ("and its last date?") keep their subject.
    const result = await chatWithAI(message, req.user, Array.isArray(history) ? history : []);
    res.json({ success: true, data: result });
  } catch (e) {
    if (String(e.message || '').includes('429')) {
      return res.status(429).json({ success: false, message: 'AI is busy right now (rate limit) — please wait a minute and ask again.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
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
    // Give every day a real topic page so plan topics are always clickable
    try { await (await import('../services/planTopics.service.js')).ensurePlanTopics(planArray); } catch (e) { console.error('ensurePlanTopics failed', e.message); }
    res.json({ success: true, data: { plan: planArray } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.get('/study-plan', protect, async (req, res) => {
  try {
    const StudyPlan = (await import('../models/StudyPlan.js')).default;
    const plan = await StudyPlan.findOne({ user: req.user._id, isActive: true }).sort({ updatedAt: -1 });
    if (!plan) return res.json({ success: true, data: { plan: null } });
    // Self-heal: plans saved before topic pages existed get theirs created now
    try { await (await import('../services/planTopics.service.js')).ensurePlanTopics(plan.plan); } catch (e) { console.error('ensurePlanTopics failed', e.message); }
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
      const Notification = (await import('../models/Notification.js')).default;
      const NotificationLog = (await import('../models/NotificationLog.js')).default;
      // Shared dedup gate with the 8 AM flow — restarting twice in one day
      // shows only one Day 1 in the bell.
      const won = await claimStudyPlanDay(req.user._id, plan._id, 1);
      if (won) {
        await Notification.create({ user: req.user._id, type: 'study_plan', title: `Day 1 Started: ${today.topic}`, message: `Your ${plan.exam} plan started! Today: ${today.topic} (${today.subject}) - ${today.hours}h` });
      }
      // Email dedupe is separate (MailDelivery), so a failed send can be
      // retried even when the in-app entry was already created.
      try {
        const result = await sendStudyPlanEmail({ user: req.user, plan, day: today });
        if (!result.skipped) {
          await NotificationLog.updateOne(
            { user: req.user._id, job: plan._id, notificationType: studyPlanLogKey(1) },
            { $set: { method: 'both' } }
          );
        }
      } catch (e) { console.error('Start email failed', e.message); }
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

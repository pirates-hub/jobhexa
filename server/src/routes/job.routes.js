import { Router } from 'express';
import { getJobs, getJobBySlug, getJobsByExamType, getJobsByState, getUpcomingDeadlines, checkJobEligibility, getRecommendedJobs } from '../controllers/job.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = Router();
// Jobs visible to logged-in users only
router.get('/', protect, getJobs);
router.get('/upcoming-deadlines', protect, getUpcomingDeadlines);
router.get('/recommended', protect, getRecommendedJobs);
router.get('/by-exam/:examType', protect, getJobsByExamType);
router.get('/by-state/:state', protect, getJobsByState);
router.get('/:slug/eligibility', protect, checkJobEligibility);
router.get('/:slug', protect, getJobBySlug);
export default router;

import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getMockTests, getMockTestBySlug, submitMockTest } from '../controllers/mockTest.controller.js';

const router = Router();
// Mock tests visible to logged-in users only (matches preparation)
router.use(protect);
router.get('/', getMockTests);
router.get('/:slug', getMockTestBySlug);
router.post('/:slug/submit', submitMockTest);

export default router;

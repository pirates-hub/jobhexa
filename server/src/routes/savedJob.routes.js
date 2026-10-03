import { Router } from 'express';
import { getSavedJobs, saveJob, removeSavedJob } from '../controllers/savedJob.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', protect, getSavedJobs);
router.post('/:jobId', protect, saveJob);
router.delete('/:jobId', protect, removeSavedJob);

export default router;

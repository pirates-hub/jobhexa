import { Router } from 'express';
import { getApplications, createApplication, updateApplication, deleteApplication } from '../controllers/application.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/', protect, getApplications);
router.post('/', protect, createApplication);
router.put('/:id', protect, updateApplication);
router.delete('/:id', protect, deleteApplication);
export default router;

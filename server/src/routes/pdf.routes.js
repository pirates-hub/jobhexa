import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.js';
import { uploadAndExtract, createJobFromExtraction } from '../controllers/pdf.controller.js';
const router = Router();
router.post('/extract', protect, adminOnly, upload.single('pdf'), uploadAndExtract);
router.post('/create-job', protect, adminOnly, createJobFromExtraction);
export default router;

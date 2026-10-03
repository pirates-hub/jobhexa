import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.js';
import { uploadAndExtract } from '../controllers/pdf.controller.js';
const router = Router();
router.post('/extract', protect, adminOnly, upload.single('pdf'), uploadAndExtract);
export default router;

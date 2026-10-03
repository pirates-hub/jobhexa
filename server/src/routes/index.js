import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import jobRoutes from './job.routes.js';
import savedJobRoutes from './savedJob.routes.js';
import preparationRoutes from './preparation.routes.js';
import applicationRoutes from './application.routes.js';
import adminRoutes from './admin.routes.js';
import pdfRoutes from './pdf.routes.js';
import chatRoutes from './chat.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/saved-jobs', savedJobRoutes);
router.use('/prep', preparationRoutes);
router.use('/applications', applicationRoutes);
router.use('/admin', adminRoutes);
router.use('/pdf', pdfRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);

export default router;

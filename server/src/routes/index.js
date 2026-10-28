import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import jobRoutes from './job.routes.js';
import savedJobRoutes from './savedJob.routes.js';
import preparationRoutes from './preparation.routes.js';
import mockTestRoutes from './mockTest.routes.js';
import applicationRoutes from './application.routes.js';
import adminRoutes from './admin.routes.js';
import { syncAggregatorJobs } from '../controllers/aggregator.controller.js';
import pdfRoutes from './pdf.routes.js';
import chatRoutes from './chat.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/saved-jobs', savedJobRoutes);
router.use('/prep', preparationRoutes);
router.use('/mock-tests', mockTestRoutes);
router.use('/applications', applicationRoutes);
// Aggregator auto-import: the fetcher POSTs jobs.json here after every run so
// the admin Aggregator Inbox fills up without manual uploads. Shared-secret
// auth (x-aggregator-sync-secret), not an admin session — intentionally kept
// outside the admin router, which enforces protect/adminOnly.
router.post('/aggregator/sync', syncAggregatorJobs);
router.use('/admin', adminRoutes);
router.use('/pdf', pdfRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);

export default router;

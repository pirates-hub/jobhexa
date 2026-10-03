import { Router } from 'express';
import { getProfile, updateProfile, updateNotificationPreferences, changePassword } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import { updateProfileValidator } from '../validators/user.validator.js';

const router = Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidator, validate, updateProfile);
router.patch('/notification-preferences', protect, updateNotificationPreferences);
router.put('/change-password', protect, changePassword);

export default router;

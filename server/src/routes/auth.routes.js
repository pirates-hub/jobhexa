import { Router } from 'express';
import { register, login, getMe, logout, refreshSession, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { handleSocialCallback } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';
import { authLimiter } from '../middleware/rateLimit.js';
import passport from '../config/passport.js';

const router = Router();

router.post('/register', authLimiter, registerValidator, validate, register);
router.post('/login', authLimiter, loginValidator, validate, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/refresh', refreshSession);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Google OAuth
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return res.status(503).json({ success: false, message: 'Google login not configured — set GOOGLE_CLIENT_ID/SECRET in .env' });
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ success: false, message: 'Google login not configured' });
  passport.authenticate('google', { session: false })(req, res, next);
}, handleSocialCallback);

export default router;

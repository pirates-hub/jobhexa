import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/tokenUtils.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const cookieOpts = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge,
});

// Access token lives in a httpOnly cookie (memory copy on the client);
// localStorage is no longer the session store.
const setSessionCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, cookieOpts(24 * 60 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));
};

export const register = async (req, res) => {
  try {
    const { name, email, password, dateOfBirth } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      dateOfBirth,
    });

    const accessToken = generateAccessToken(user._id, user.role, user.tokenVersion || 0);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0);

    setSessionCookies(res, accessToken, refreshToken);

    return successResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role, user.tokenVersion || 0);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0);

    setSessionCookies(res, accessToken, refreshToken);

    return successResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return successResponse(res, { user });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const logout = async (req, res) => {
  try {
    // Revoke the session family so stolen refresh tokens stop working
    if (req.user?._id) {
      await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    }
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    return successResponse(res, { message: 'Logged out successfully' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const refreshSession = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return errorResponse(res, 'No refresh token', 401);
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return errorResponse(res, 'Refresh token invalid or expired', 401);
    }
    const user = await User.findById(decoded.id);
    if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
      return errorResponse(res, 'Session revoked — login again', 401);
    }
    const accessToken = generateAccessToken(user._id, user.role, user.tokenVersion || 0);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0);
    setSessionCookies(res, accessToken, refreshToken);
    return successResponse(res, {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const done = 'If that email is registered, a reset link was sent.';
    if (!email) return errorResponse(res, 'Email is required', 400);
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return successResponse(res, { message: done });
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    try {
      const { sendEmail } = await import('../config/nodemailer.js');
      await sendEmail({
        to: user.email,
        subject: 'Reset your JobHexa password',
        html: `<p>Hi ${user.name || ''},</p><p>Click to reset (valid 10 minutes):</p><p><a href="${link}">${link}</a></p><p>If you did not ask, ignore this mail.</p>`,
        text: `Reset your password (10 minutes): ${link}`,
      });
    } catch (e) { console.error('[Forgot] mail failed', e.message); }
    return successResponse(res, { message: done });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return errorResponse(res, 'Token and new password required', 400);
    if (String(password).length < 6) return errorResponse(res, 'Password must be at least 6 characters', 400);
    const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({ passwordResetToken: hash, passwordResetExpires: { $gt: new Date() } }).select('+passwordHash');
    if (!user) return errorResponse(res, 'Link invalid or expired — request a new one', 400);
    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // revoke other sessions
    await user.save();
    return successResponse(res, { message: 'Password reset — login with your new password' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const handleSocialCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=no_user`);
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    const accessToken = generateAccessToken(user._id, user.role, user.tokenVersion || 0);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0);
    // Tokens travel in httpOnly cookies, never in the callback URL
    setSessionCookies(res, accessToken, refreshToken);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=${encodeURIComponent(e.message)}`);
  }
};

import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return successResponse(res, { user });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'name', 'phone', 'dateOfBirth', 'gender',
      'qualification', 'state', 'district', 'category',
      'preferredExamTypes', 'notificationPreferences',
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findById(req.user._id);

    const hasProfile = user.qualification?.highest && user.state && user.category;
    Object.assign(user, updates);

    if (!hasProfile && user.qualification?.highest && user.state && user.category) {
      user.profileCompleted = true;
    }

    await user.save();

    return successResponse(res, { user });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...req.body,
    };
    await user.save();
    return successResponse(res, { notificationPreferences: user.notificationPreferences });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+passwordHash');
    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.default.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    user.passwordHash = await bcrypt.default.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // revoke other sessions
    await user.save();

    return successResponse(res, { message: 'Password updated successfully' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

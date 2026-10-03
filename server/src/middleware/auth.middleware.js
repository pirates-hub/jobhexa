import User from '../models/User.js';
import { verifyToken } from '../utils/tokenUtils.js';
import { errorResponse } from '../utils/apiResponse.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return errorResponse(res, 'Not authorized, no token', 401);
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return errorResponse(res, 'Not authorized, user not found', 401);
    }

    // Session revocation: tokens carrying a stale version are rejected
    if (decoded.tv !== undefined && (user.tokenVersion || 0) !== decoded.tv) {
      return errorResponse(res, 'Session revoked — login again', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Not authorized, token invalid', 401);
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return errorResponse(res, 'Admin access required', 403);
};

const User = require('../models/user.model');
const { verifyAccessToken } = require('../utils/token.util');
const { ACCOUNT_STATUS, ERROR_CODES } = require('../utils/constants');

/**
 * Middleware to require a valid access token and active user account.
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      error.code = ERROR_CODES.AUTHENTICATION_REQUIRED;
      return next(error);
    }

    const decoded = verifyAccessToken(token);

    // Note: To minimize DB hits on every request, we could rely solely on the token for identity,
    // but fetching the user ensures we catch immediately disabled/deleted accounts.
    // In a high-scale environment, we might cache this or rely on short-lived tokens and check DB only on refresh.
    // For Phase 1A, we will verify the user still exists and is ACTIVE.
    const user = await User.findById(decoded.id).select('id role status');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_ACCESS_TOKEN;
      return next(error);
    }

    if (user.status !== ACCOUNT_STATUS.ACTIVE) {
      const error = new Error('Account is inactive');
      error.statusCode = 403;
      error.code = ERROR_CODES.ACCOUNT_INACTIVE;
      return next(error);
    }

    // Attach minimal trusted identity representation to the request
    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (err) {
    // JWT verification errors (expired, invalid, etc.) will be caught here
    // We let the centralized error handler deal with the specific JWT error
    err.statusCode = 401;
    err.code = ERROR_CODES.INVALID_ACCESS_TOKEN;
    next(err);
  }
};

/**
 * Middleware factory for role-based access control.
 * 
 * @param {...string} allowedRoles - Roles allowed to access the route.
 * @returns {Function} - Express middleware function.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      error.code = ERROR_CODES.AUTHENTICATION_REQUIRED;
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error('Forbidden: Insufficient privileges');
      error.statusCode = 403;
      error.code = ERROR_CODES.FORBIDDEN;
      return next(error);
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};

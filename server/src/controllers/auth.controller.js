import { StatusCodes } from 'http-status-codes';
import { sendSuccess } from '../utils/response.js';
import * as authService from '../services/auth.service.js';

/**
 * Authentication controller.
 *
 * Thin controller layer — reads request data, calls auth service,
 * sets/clears cookies, and returns responses using existing response helpers.
 *
 * SECURITY:
 * - Access tokens are ONLY delivered via HTTP-only cookies
 * - Refresh tokens are ONLY delivered via HTTP-only cookies
 * - No tokens ever appear in JSON response bodies
 */

// ── Cookie Helpers ────────────────────────────────────────────────

/**
 * Set authentication cookies on the response.
 *
 * @param {import('express').Response} res
 * @param {object} tokens
 * @param {string} tokens.accessToken - JWT access token
 * @param {string} tokens.refreshToken - Raw refresh token
 * @param {Date} tokens.refreshExpiresAt - Refresh token expiry
 */
const setAuthCookies = (res, { accessToken, refreshToken, refreshExpiresAt }) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: refreshExpiresAt - Date.now(),
  });
};

/**
 * Clear authentication cookies from the response.
 *
 * @param {import('express').Response} res
 */
const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
};

// ── Controllers ───────────────────────────────────────────────────

/**
 * Register a new user.
 * POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { employeeId, email, password } = req.body;
    const ipAddress = req.ip;

    const user = await authService.registerUser({ employeeId, email, password, ipAddress });

    sendSuccess(res, {
      data: user,
      message: 'Registration successful',
      statusCode: StatusCodes.CREATED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login a user.
 * POST /api/v1/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent') || null;

    const result = await authService.loginUser({ email, password, ipAddress, userAgent });

    // Set cookies — tokens never appear in JSON
    setAuthCookies(res, result);

    sendSuccess(res, {
      data: { user: result.user },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout a user.
 * POST /api/v1/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || null;
    const userId = req.user?.id || null;
    const ipAddress = req.ip;

    await authService.logoutUser({ refreshToken, userId, ipAddress });

    clearAuthCookies(res);

    sendSuccess(res, {
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh authentication session.
 * POST /api/v1/auth/refresh
 */
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || null;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent') || null;

    const result = await authService.refreshSession({ refreshToken, ipAddress, userAgent });

    // Set new cookies — tokens never appear in JSON
    setAuthCookies(res, result);

    sendSuccess(res, {
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user.
 * GET /api/v1/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    sendSuccess(res, {
      data: { user },
      message: 'User retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password.
 * POST /api/v1/auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const ipAddress = req.ip;

    await authService.changePassword({ userId, currentPassword, newPassword, ipAddress });

    clearAuthCookies(res);

    sendSuccess(res, {
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate password reset (forgot password).
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip;

    await authService.forgotPassword({ email, ipAddress });

    // Always return the same generic message regardless of whether
    // the email exists — prevents account enumeration
    sendSuccess(res, {
      message: 'If the account exists, password reset instructions have been sent',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify password reset OTP.
 * POST /api/v1/auth/verify-reset-otp
 */
export const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    await authService.verifyResetOtp({ email, otp });

    sendSuccess(res, {
      message: 'Verification code is valid',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password after OTP verification.
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const ipAddress = req.ip;

    await authService.resetPassword({ email, otp, newPassword, ipAddress });

    clearAuthCookies(res);

    sendSuccess(res, {
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

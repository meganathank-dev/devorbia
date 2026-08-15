import { comparePassword, hashPassword, validatePasswordStrength } from '../utils/password.util.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/token.util.js';
import { generateOTP } from '../utils/otp.util.js';
import { ACCOUNT_STATUS } from '../constants/account-status.js';
import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  SECURITY_EVENTS,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
} from '../constants/auth.constants.js';
import * as userRepository from '../repositories/user.repository.js';
import * as sessionRepository from '../repositories/session.repository.js';
import * as passwordResetRepository from '../repositories/password-reset.repository.js';
import { createSecurityEvent } from './security-event.service.js';
import { sendPasswordResetEmail } from './email.service.js';
import {
  UnauthorizedError,
  BadRequestError,
  ConflictError,
} from '../errors/app.error.js';
import env from '../config/env.config.js';
import logger from '../utils/logger.js';

/**
 * Authentication service — core authentication business logic.
 *
 * This service builds on the Phase 1A security foundation
 * (password verification, account-status checks, lock management,
 * failed-login handling) and adds the full authentication lifecycle:
 * registration, login, logout, token refresh, password management,
 * and password reset.
 *
 * SECURITY RULES:
 * - Never log passwords, OTPs, JWTs, refresh tokens, or token hashes
 * - Never return sensitive data in responses
 * - Only store SHA-256 hashes of refresh tokens
 * - Only store bcrypt hashes of OTPs and passwords
 */

// ── Safe User Transformation ──────────────────────────────────────

/**
 * Transform a user document into a safe representation.
 * Strips all sensitive and internal fields.
 *
 * @param {object} user - The Mongoose user document
 * @returns {object} Safe user data
 */
export const toSafeUser = (user) => ({
  id: user._id,
  employeeId: user.employeeId,
  email: user.email,
  role: user.role,
  accountStatus: user.accountStatus,
  organizationId: user.organizationId || null,
  profileId: user.profileId || null,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

// ── Phase 1A Methods (preserved) ──────────────────────────────────

/**
 * Verify a plaintext password against a user's stored password hash.
 *
 * @param {string} password - The plaintext password to check
 * @param {string} passwordHash - The stored bcrypt hash
 * @returns {Promise<boolean>} True if the password matches
 */
export const verifyPassword = async (password, passwordHash) => {
  return comparePassword(password, passwordHash);
};

/**
 * Check if an account status allows login.
 *
 * @param {string} accountStatus - The user's current account status
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export const checkAccountStatus = (accountStatus) => {
  switch (accountStatus) {
    case ACCOUNT_STATUS.ACTIVE:
      return { allowed: true, reason: null };

    case ACCOUNT_STATUS.PENDING:
      return { allowed: false, reason: 'Account is pending activation' };

    case ACCOUNT_STATUS.LOCKED:
      return { allowed: false, reason: 'Account is locked' };

    case ACCOUNT_STATUS.SUSPENDED:
      return { allowed: false, reason: 'Account has been suspended' };

    case ACCOUNT_STATUS.DEACTIVATED:
      return { allowed: false, reason: 'Account has been deactivated' };

    default:
      return { allowed: false, reason: 'Invalid account status' };
  }
};

/**
 * Check if a user's account lock has expired.
 *
 * If the lock has expired, the lock state is automatically cleared
 * and the account status is restored to active.
 *
 * @param {object} user - The user document
 * @returns {Promise<{ isLocked: boolean, user: object }>}
 */
export const checkLockState = async (user) => {
  // Not locked
  if (user.accountStatus !== ACCOUNT_STATUS.LOCKED || !user.lockedUntil) {
    return { isLocked: false, user };
  }

  // Lock has expired — clear it
  if (new Date() > user.lockedUntil) {
    const updatedUser = await userRepository.resetFailedLoginState(user._id);

    // Restore to active if status was locked
    if (updatedUser.accountStatus === ACCOUNT_STATUS.LOCKED) {
      updatedUser.accountStatus = ACCOUNT_STATUS.ACTIVE;
      await updatedUser.save();
    }

    return { isLocked: false, user: updatedUser };
  }

  // Still locked
  return { isLocked: true, user };
};

/**
 * Handle a failed login attempt for a user.
 *
 * Increments the failed login counter and locks the account
 * if the maximum attempts are reached.
 *
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<{ locked: boolean, attemptsRemaining: number }>}
 */
export const handleFailedLogin = async (userId) => {
  const user = await userRepository.recordFailedLoginAttempt(userId);
  const attemptsRemaining = Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - user.failedLoginAttempts);

  if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    await userRepository.lockAccount(userId);
    return { locked: true, attemptsRemaining: 0 };
  }

  return { locked: false, attemptsRemaining };
};

/**
 * Reset failed login state after a successful authentication.
 *
 * Clears the failed attempt counter and removes any lock.
 *
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<object>} The updated user document
 */
export const resetFailedAttempts = async (userId) => {
  return userRepository.resetFailedLoginState(userId);
};

// ── Phase 1B Methods ──────────────────────────────────────────────

/**
 * Register a new user.
 *
 * @param {object} params
 * @param {string} params.employeeId - Unique employee identifier
 * @param {string} params.email - User's email address
 * @param {string} params.password - Plaintext password
 * @param {string} [params.ipAddress] - Client IP address
 * @returns {Promise<object>} Safe user data
 */
export const registerUser = async ({ employeeId, email, password, ipAddress }) => {
  // Validate password strength
  const strength = validatePasswordStrength(password);
  if (!strength.isValid) {
    throw new BadRequestError('Password does not meet strength requirements', strength.errors);
  }

  // Check for existing user by email
  const existingByEmail = await userRepository.findUserByEmail(email);
  if (existingByEmail) {
    throw new ConflictError('An account with this email already exists');
  }

  // Check for existing user by employeeId
  const existingByEmployeeId = await userRepository.findUserByEmployeeId(employeeId);
  if (existingByEmployeeId) {
    throw new ConflictError('An account with this employee ID already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user with ACTIVE status (no email verification in Phase 1B)
  const user = await userRepository.createUser({
    employeeId,
    email,
    passwordHash,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
  });

  // Record security event
  await createSecurityEvent({
    userId: user._id,
    eventType: SECURITY_EVENTS.REGISTRATION,
    ipAddress,
    metadata: { employeeId: user.employeeId },
  });

  return toSafeUser(user);
};

/**
 * Authenticate a user and create a session.
 *
 * @param {object} params
 * @param {string} params.email - User's email address
 * @param {string} params.password - Plaintext password
 * @param {string} [params.ipAddress] - Client IP address
 * @param {string} [params.userAgent] - Client user agent
 * @returns {Promise<object>} { user, accessToken, refreshToken, refreshExpiresAt }
 */
export const loginUser = async ({ email, password, ipAddress, userAgent }) => {
  // Find user with password hash
  const user = await userRepository.findUserByEmail(email, { includePasswordHash: true });

  if (!user) {
    // Do not reveal whether the email exists
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check account status
  const statusCheck = checkAccountStatus(user.accountStatus);
  if (!statusCheck.allowed) {
    // Check if lock has expired
    if (user.accountStatus === ACCOUNT_STATUS.LOCKED) {
      const lockCheck = await checkLockState(user);
      if (lockCheck.isLocked) {
        throw new UnauthorizedError(statusCheck.reason);
      }
      // Lock expired — continue with the unlocked user
      Object.assign(user, lockCheck.user);
    } else {
      throw new UnauthorizedError(statusCheck.reason);
    }
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    // Handle failed login
    const failResult = await handleFailedLogin(user._id);

    if (failResult.locked) {
      await createSecurityEvent({
        userId: user._id,
        eventType: SECURITY_EVENTS.ACCOUNT_LOCKED,
        ipAddress,
        userAgent,
        metadata: { reason: 'Max failed login attempts exceeded' },
      });
    }

    await createSecurityEvent({
      userId: user._id,
      eventType: SECURITY_EVENTS.LOGIN_FAILED,
      ipAddress,
      userAgent,
    });

    throw new UnauthorizedError('Invalid email or password');
  }

  // Success — reset failed attempts and update login info
  await resetFailedAttempts(user._id);
  await userRepository.updateLoginInfo(user._id);

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  // Calculate refresh token expiry
  const refreshExpiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  );

  // Create session
  await sessionRepository.createSession({
    userId: user._id,
    tokenHash,
    expiresAt: refreshExpiresAt,
    metadata: {
      ipAddress,
      userAgent,
    },
  });

  // Record security event
  await createSecurityEvent({
    userId: user._id,
    eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
    ipAddress,
    userAgent,
  });

  // Reload user to get updated lastLoginAt
  const updatedUser = await userRepository.findUserById(user._id);

  return {
    user: toSafeUser(updatedUser),
    accessToken,
    refreshToken,
    refreshExpiresAt,
  };
};

/**
 * Log out a user by revoking their session.
 *
 * @param {object} params
 * @param {string} params.refreshToken - The raw refresh token from cookie
 * @param {string} [params.userId] - The authenticated user's ID
 * @param {string} [params.ipAddress] - Client IP address
 */
export const logoutUser = async ({ refreshToken, userId, ipAddress }) => {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const session = await sessionRepository.findSessionByTokenHash(tokenHash);

    if (session && !session.revokedAt) {
      await sessionRepository.revokeSession(session._id);
    }
  }

  if (userId) {
    await createSecurityEvent({
      userId,
      eventType: SECURITY_EVENTS.LOGOUT,
      ipAddress,
    });
  }
};

/**
 * Refresh an authentication session.
 *
 * Token reuse detection:
 * - If no session exists for the hash → 401 (invalid token)
 * - If session exists but is revoked → TOKEN_REUSE_DETECTED, revoke all, 401
 * - If atomic rotation fails → TOKEN_REUSE_DETECTED (race), revoke all, 401
 *
 * @param {object} params
 * @param {string} params.refreshToken - The raw refresh token from cookie
 * @param {string} [params.ipAddress] - Client IP address
 * @param {string} [params.userAgent] - Client user agent
 * @returns {Promise<object>} { accessToken, refreshToken, refreshExpiresAt }
 */
export const refreshSession = async ({ refreshToken, ipAddress, userAgent }) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required');
  }

  const tokenHash = hashToken(refreshToken);
  const session = await sessionRepository.findSessionByTokenHash(tokenHash);

  // No session found — invalid token (not necessarily reuse)
  if (!session) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Session exists but is revoked — this IS token reuse
  if (session.revokedAt) {
    logger.warn('Refresh token reuse detected', { userId: session.user.toString() });

    await createSecurityEvent({
      userId: session.user,
      eventType: SECURITY_EVENTS.TOKEN_REUSE_DETECTED,
      ipAddress,
      userAgent,
      metadata: { sessionId: session._id.toString() },
    });

    // Revoke ALL sessions for this user
    await sessionRepository.revokeAllUserSessions(session.user);

    throw new UnauthorizedError('Token reuse detected — all sessions revoked');
  }

  // Check expiration
  if (new Date() > session.expiresAt) {
    await sessionRepository.revokeSession(session._id);
    throw new UnauthorizedError('Refresh token has expired');
  }

  // Load user and verify account is still active
  const user = await userRepository.findUserById(session.user);
  if (!user) {
    await sessionRepository.revokeSession(session._id);
    throw new UnauthorizedError('User not found');
  }

  const statusCheck = checkAccountStatus(user.accountStatus);
  if (!statusCheck.allowed) {
    await sessionRepository.revokeSession(session._id);
    throw new UnauthorizedError(statusCheck.reason);
  }

  // Generate new tokens
  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  );

  // Atomically rotate session
  const rotated = await sessionRepository.rotateSession(session._id, newTokenHash, newExpiresAt);

  if (!rotated) {
    // Atomic rotation failed — session was already revoked/rotated (race condition)
    logger.warn('Refresh token rotation race detected', { userId: session.user.toString() });

    await createSecurityEvent({
      userId: session.user,
      eventType: SECURITY_EVENTS.TOKEN_REUSE_DETECTED,
      ipAddress,
      userAgent,
      metadata: { sessionId: session._id.toString(), reason: 'rotation_race' },
    });

    await sessionRepository.revokeAllUserSessions(session.user);

    throw new UnauthorizedError('Token reuse detected — all sessions revoked');
  }

  // Generate new access token
  const accessToken = generateAccessToken(user._id, user.role);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    refreshExpiresAt: newExpiresAt,
  };
};

/**
 * Get the current authenticated user's safe profile.
 *
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<object>} Safe user data
 */
export const getCurrentUser = async (userId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }
  return toSafeUser(user);
};

/**
 * Change a user's password.
 *
 * @param {object} params
 * @param {string} params.userId - The user's ObjectId
 * @param {string} params.currentPassword - Current plaintext password
 * @param {string} params.newPassword - New plaintext password
 * @param {string} [params.ipAddress] - Client IP address
 */
export const changePassword = async ({ userId, currentPassword, newPassword, ipAddress }) => {
  // Load user with password hash
  const user = await userRepository.findUserById(userId, { includePasswordHash: true });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Verify current password
  const currentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Validate new password strength
  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    throw new BadRequestError('New password does not meet strength requirements', strength.errors);
  }

  // Hash and update
  const newPasswordHash = await hashPassword(newPassword);
  await userRepository.updatePassword(userId, newPasswordHash);

  // Revoke ALL sessions
  await sessionRepository.revokeAllUserSessions(userId);

  // Record security event
  await createSecurityEvent({
    userId,
    eventType: SECURITY_EVENTS.PASSWORD_CHANGED,
    ipAddress,
  });
};

/**
 * Initiate a password reset (forgot password).
 *
 * SECURITY: Always returns success regardless of whether the email exists.
 * This prevents account enumeration.
 *
 * @param {object} params
 * @param {string} params.email - User's email address
 * @param {string} [params.ipAddress] - Client IP address
 */
export const forgotPassword = async ({ email, ipAddress }) => {
  const user = await userRepository.findUserByEmail(email);

  if (!user) {
    // Silently succeed — do not reveal whether account exists
    return;
  }

  // Invalidate any existing password reset records
  await passwordResetRepository.invalidateAllForUser(user._id);

  // Generate OTP
  const otp = generateOTP();

  // Hash OTP (bcrypt)
  const otpHash = await hashPassword(otp);

  // Calculate expiry
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store reset record
  await passwordResetRepository.createPasswordReset({
    userId: user._id,
    otpHash,
    expiresAt,
  });

  // Send email (never logs OTP)
  await sendPasswordResetEmail(email, otp);

  // Record security event (no OTP in metadata)
  await createSecurityEvent({
    userId: user._id,
    eventType: SECURITY_EVENTS.PASSWORD_RESET_REQUESTED,
    ipAddress,
    metadata: { email },
  });
};

/**
 * Verify a password reset OTP.
 *
 * @param {object} params
 * @param {string} params.email - User's email address
 * @param {string} params.otp - The OTP to verify
 * @returns {Promise<{ valid: boolean }>}
 */
export const verifyResetOtp = async ({ email, otp }) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new BadRequestError('Invalid or expired reset request');
  }

  const resetRecord = await passwordResetRepository.findActiveResetByUser(user._id);
  if (!resetRecord) {
    throw new BadRequestError('Invalid or expired reset request');
  }

  // Check expiration
  if (new Date() > resetRecord.expiresAt) {
    throw new BadRequestError('Reset code has expired');
  }

  // Check max attempts
  if (resetRecord.attempts >= OTP_MAX_ATTEMPTS) {
    throw new BadRequestError('Maximum verification attempts exceeded');
  }

  // Increment attempts
  await passwordResetRepository.incrementAttempts(resetRecord._id);

  // Compare OTP
  const otpValid = await comparePassword(otp, resetRecord.otpHash);

  if (!otpValid) {
    await createSecurityEvent({
      userId: user._id,
      eventType: SECURITY_EVENTS.OTP_VERIFICATION_FAILED,
    });
    throw new BadRequestError('Invalid verification code');
  }

  // OTP is valid
  await createSecurityEvent({
    userId: user._id,
    eventType: SECURITY_EVENTS.OTP_VERIFIED,
  });

  return { valid: true };
};

/**
 * Reset a user's password after OTP verification.
 *
 * Re-verifies the OTP to prevent time-of-check-time-of-use issues.
 *
 * @param {object} params
 * @param {string} params.email - User's email address
 * @param {string} params.otp - The OTP for verification
 * @param {string} params.newPassword - New plaintext password
 * @param {string} [params.ipAddress] - Client IP address
 */
export const resetPassword = async ({ email, otp, newPassword, ipAddress }) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new BadRequestError('Invalid or expired reset request');
  }

  const resetRecord = await passwordResetRepository.findActiveResetByUser(user._id);
  if (!resetRecord) {
    throw new BadRequestError('Invalid or expired reset request');
  }

  // Check expiration
  if (new Date() > resetRecord.expiresAt) {
    throw new BadRequestError('Reset code has expired');
  }

  // Check max attempts
  if (resetRecord.attempts >= OTP_MAX_ATTEMPTS) {
    throw new BadRequestError('Maximum verification attempts exceeded');
  }

  // Re-verify OTP
  const otpValid = await comparePassword(otp, resetRecord.otpHash);
  if (!otpValid) {
    await passwordResetRepository.incrementAttempts(resetRecord._id);

    await createSecurityEvent({
      userId: user._id,
      eventType: SECURITY_EVENTS.OTP_VERIFICATION_FAILED,
    });
    throw new BadRequestError('Invalid verification code');
  }

  // Validate new password strength
  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    throw new BadRequestError('New password does not meet strength requirements', strength.errors);
  }

  // Hash and update password
  const newPasswordHash = await hashPassword(newPassword);
  await userRepository.updatePassword(user._id, newPasswordHash);

  // Revoke ALL sessions
  await sessionRepository.revokeAllUserSessions(user._id);

  // Mark reset record as used
  await passwordResetRepository.markAsUsed(resetRecord._id);

  // Record security event
  await createSecurityEvent({
    userId: user._id,
    eventType: SECURITY_EVENTS.PASSWORD_RESET_COMPLETED,
    ipAddress,
  });
};

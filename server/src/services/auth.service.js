const Session = require('../models/session.model');
const UserRepository = require('../repositories/user.repository');
const { comparePassword } = require('../utils/password.util');
const { 
  hashToken, 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} = require('../utils/token.util');
const { ACCOUNT_STATUS, ERROR_CODES } = require('../utils/constants');

/**
 * Service for managing authentication sessions.
 */
class AuthService {
  
  /**
   * Login user and generate tokens
   */
  static async login(email, password) {
    const user = await UserRepository.findByNormalizedEmail(email);
    
    // Generic error to prevent enumeration
    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }

    if (user.status !== ACCOUNT_STATUS.ACTIVE) {
      const error = new Error('Account is inactive.');
      error.statusCode = 403;
      error.code = ERROR_CODES.ACCOUNT_INACTIVE;
      throw error;
    }

    // Update last login
    await UserRepository.updateLastLogin(user._id);

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: user._id });

    // Assuming refresh token expires in 7 days for DB cleanup
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

    await this.createSession(user._id, refreshToken, expiresAt);

    return {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Rotate a refresh session, issuing new tokens
   */
  static async refreshSession(oldRefreshToken) {
    if (!oldRefreshToken) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      error.code = ERROR_CODES.AUTHENTICATION_REQUIRED;
      throw error;
    }

    // Verify signature and expiration (will throw if invalid/expired)
    const decoded = verifyRefreshToken(oldRefreshToken);
    
    // Validate session in DB
    const session = await this.validateSession(decoded.id, oldRefreshToken);
    
    if (!session) {
      // Possible token reuse attack or simply already logged out.
      // A robust implementation might revoke all sessions here, 
      // but for Phase 1B we'll just reject it safely.
      const error = new Error('Invalid refresh token.');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_REFRESH_TOKEN;
      throw error;
    }

    // Verify user still exists and is active
    // We could use UserRepository.findById but we don't have it yet, 
    // we can add it or just use User model directly here, wait we should use User model or repo.
    // Let's import User model to be simple or create a method in Repo.
    const User = require('../models/user.model');
    const user = await User.findById(decoded.id);

    if (!user || user.status !== ACCOUNT_STATUS.ACTIVE) {
      const error = new Error('Account inactive or not found.');
      error.statusCode = 401;
      error.code = ERROR_CODES.ACCOUNT_INACTIVE;
      throw error;
    }

    // Revoke old session
    await this.revokeSession(decoded.id, oldRefreshToken);

    // Issue new tokens
    const payload = { id: user._id, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken({ id: user._id });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.createSession(user._id, newRefreshToken, expiresAt);

    return {
      newAccessToken,
      newRefreshToken
    };
  }

  /**
   * Create a new refresh session for a user.
   */
  static async createSession(userId, refreshToken, expiresAt) {
    const tokenHash = hashToken(refreshToken);

    const session = new Session({
      user: userId,
      tokenHash,
      expiresAt,
    });

    await session.save();
    return session;
  }

  /**
   * Validate a session exists and is not revoked.
   */
  static async validateSession(userId, refreshToken) {
    const tokenHash = hashToken(refreshToken);

    const session = await Session.findOne({
      user: userId,
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() }, // ensure it hasn't expired even if TTL hasn't run
    });

    return session;
  }

  /**
   * Revoke a specific session.
   */
  static async revokeSession(userId, refreshToken) {
    if (!refreshToken) return false;
    const tokenHash = hashToken(refreshToken);

    const result = await Session.updateOne(
      { user: userId, tokenHash },
      { $set: { revokedAt: new Date() } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Revoke all sessions for a user.
   */
  static async revokeAllUserSessions(userId) {
    const result = await Session.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return result.modifiedCount;
  }
}

module.exports = AuthService;

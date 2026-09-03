const authService = require('../services/auth.service');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookie.util');
const User = require('../models/user.model');

class AuthController {
  
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const { user, accessToken, refreshToken } = await authService.login(email, password);

      setAuthCookies(res, accessToken, refreshToken);

      return res.status(200).json({
        success: true,
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req, res, next) {
    try {
      const oldRefreshToken = req.cookies?.refreshToken;
      
      const { newAccessToken, newRefreshToken } = await authService.refreshSession(oldRefreshToken);

      setAuthCookies(res, newAccessToken, newRefreshToken);

      return res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      // Note: we might not have `req.user.id` here if this is unauthenticated logout
      // But we can decode the token or try to find session by token hash
      // To strictly follow architecture without decoding in controller,
      // let's decode it safely. If it's invalid, they're already logged out.
      if (refreshToken) {
        const { verifyRefreshToken } = require('../utils/token.util');
        try {
          const decoded = verifyRefreshToken(refreshToken);
          await authService.revokeSession(decoded.id, refreshToken);
        } catch (_) {
          // Token invalid or expired, ignore and just clear cookies
        }
      }

      clearAuthCookies(res);

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async logoutAll(req, res, next) {
    try {
      await authService.revokeAllUserSessions(req.user.id);

      clearAuthCookies(res);

      return res.status(200).json({
        success: true,
        message: 'All sessions revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req, res, next) {
    try {
      // req.user only contains id and role from token. Let's fetch the rest safely.
      const user = await User.findById(req.user.id).select('email role status');

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            status: user.status
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;

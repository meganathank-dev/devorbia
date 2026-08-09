import { verifyAccessToken } from '../utils/token.util.js';
import * as userRepository from '../repositories/user.repository.js';
import { UnauthorizedError } from '../errors/app.error.js';
import { ACCOUNT_STATUS } from '../constants/account-status.js';

/**
 * Authentication middleware.
 *
 * Extracts and validates the JWT access token, loads the user,
 * verifies account status, and attaches a safe user representation
 * to the request object.
 *
 * Token source priority:
 * 1. accessToken HTTP-only cookie (primary)
 * 2. Authorization: Bearer <token> header (fallback)
 *
 * SECURITY:
 * - Never exposes passwordHash
 * - Rejects locked/suspended/deactivated accounts
 * - Uses generic error messages to avoid information leakage
 */

/**
 * Authenticate incoming requests.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export const authenticate = async (req, _res, next) => {
  try {
    // 1. Extract token from cookie or Authorization header
    let token = req.cookies?.accessToken || null;

    if (!token) {
      const authHeader = req.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    // 2. Verify JWT (signature, expiration, issuer)
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return next(new UnauthorizedError('Invalid or expired access token'));
    }

    // 3. Load user (without passwordHash)
    const user = await userRepository.findUserById(decoded.sub);

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // 4. Verify account status
    const blockedStatuses = [
      ACCOUNT_STATUS.LOCKED,
      ACCOUNT_STATUS.SUSPENDED,
      ACCOUNT_STATUS.DEACTIVATED,
    ];

    if (blockedStatuses.includes(user.accountStatus)) {
      throw new UnauthorizedError('Account is not active');
    }

    // 5. Attach safe user representation to request
    req.user = {
      id: user._id,
      employeeId: user.employeeId,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      organizationId: user.organizationId || null,
    };

    next();
  } catch (error) {
    next(error);
  }
};

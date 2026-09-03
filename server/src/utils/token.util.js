const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a short-lived access token.
 * 
 * @param {Object} payload - Data to encode in the token (e.g., { id, role }).
 * @returns {string} - The JWT access token.
 */
const generateAccessToken = (payload) => {
  const secret = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
  
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Generate a long-lived refresh token.
 * 
 * @param {Object} payload - Data to encode in the token (e.g., { id }).
 * @returns {string} - The JWT refresh token.
 */
const generateRefreshToken = (payload) => {
  const secret = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret';
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  
  // Add jti to ensure uniqueness of the generated token string
  const tokenPayload = { ...payload, jti: crypto.randomUUID() };
  
  return jwt.sign(tokenPayload, secret, { expiresIn });
};

/**
 * Verify an access token.
 * 
 * @param {string} token - The access token to verify.
 * @returns {Object} - The decoded payload if valid.
 * @throws {Error} - If token is invalid or expired.
 */
const verifyAccessToken = (token) => {
  const secret = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';
  return jwt.verify(token, secret);
};

/**
 * Verify a refresh token.
 * 
 * @param {string} token - The refresh token to verify.
 * @returns {Object} - The decoded payload if valid.
 * @throws {Error} - If token is invalid or expired.
 */
const verifyRefreshToken = (token) => {
  const secret = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret';
  return jwt.verify(token, secret);
};

/**
 * Cryptographically hash a token (e.g., for storing refresh tokens in DB).
 * 
 * @param {string} token - The token to hash.
 * @returns {string} - The SHA-256 hash in hex format.
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};

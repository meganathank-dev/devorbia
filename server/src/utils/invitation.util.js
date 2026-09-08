const crypto = require('crypto');

/**
 * Generate a secure random token for invitations.
 * 
 * @returns {string} - The hex-encoded random token.
 */
const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Cryptographically hash an invitation token for secure database storage.
 * 
 * @param {string} token - The raw invitation token.
 * @returns {string} - The SHA-256 hash in hex format.
 */
const hashInvitationToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateInvitationToken,
  hashInvitationToken,
};

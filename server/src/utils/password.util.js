const argon2 = require('argon2');

/**
 * Hash a plaintext password using Argon2id.
 * 
 * @param {string} password - The plaintext password to hash.
 * @returns {Promise<string>} - The hashed password.
 */
const hashPassword = async (password) => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      hashLength: 32,
      timeCost: 3,
      memoryCost: 4096, // 4 MB
      parallelism: 1,
    });
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

/**
 * Verify a plaintext password against a hash.
 * 
 * @param {string} password - The plaintext password.
 * @param {string} hash - The stored argon2 hash.
 * @returns {Promise<boolean>} - True if the password matches, false otherwise.
 */
const comparePassword = async (password, hash) => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // Return false on error rather than throwing to prevent timing attacks/information leakage
    return false;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
};

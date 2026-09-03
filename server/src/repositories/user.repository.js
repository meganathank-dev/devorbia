const User = require('../models/user.model');

class UserRepository {
  /**
   * Find a user by email, strictly ignoring case.
   * 
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  static async findByNormalizedEmail(email) {
    if (!email) return null;
    
    // Normalization should match the model configuration (lowercase)
    const normalizedEmail = email.toLowerCase().trim();
    
    return User.findOne({ email: normalizedEmail });
  }

  /**
   * Update the last login timestamp for a user.
   * 
   * @param {string} userId 
   * @returns {Promise<void>}
   */
  static async updateLastLogin(userId) {
    await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
  }
}

module.exports = UserRepository;

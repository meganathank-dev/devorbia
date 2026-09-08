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

  static async findById(id) {
    return User.findById(id);
  }

  static async create(userData, options = {}) {
    if (userData.email) {
      userData.email = userData.email.toLowerCase().trim();
    }
    const user = new User(userData);
    return user.save(options);
  }

  static async update(id, updateData) {
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }
    return User.findByIdAndUpdate(id, updateData, { new: true });
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

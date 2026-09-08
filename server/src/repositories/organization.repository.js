const Organization = require('../models/organization.model');

class OrganizationRepository {
  static async create(orgData, options = {}) {
    const org = new Organization(orgData);
    return org.save(options);
  }

  static async findById(id) {
    return Organization.findById(id);
  }

  static async count() {
    return Organization.countDocuments();
  }

  static async findBySlug(slug) {
    return Organization.findOne({ slug });
  }

  static async update(id, updateData, options = {}) {
    return Organization.findByIdAndUpdate(id, updateData, { new: true, ...options });
  }
}

module.exports = OrganizationRepository;

const Membership = require('../models/membership.model');
const { MEMBERSHIP_STATUS } = require('../utils/constants');

class MembershipRepository {
  static async create(membershipData, options = {}) {
    const membership = new Membership(membershipData);
    return membership.save(options);
  }

  static async findByUserAndOrganization(userId, organizationId) {
    return Membership.findOne({ userId, organizationId });
  }

  static async findActiveMembership(userId, organizationId) {
    return Membership.findOne({ 
      userId, 
      organizationId, 
      status: MEMBERSHIP_STATUS.ACTIVE 
    });
  }

  static async findActiveMembershipsForUser(userId) {
    return Membership.find({ 
      userId, 
      status: MEMBERSHIP_STATUS.ACTIVE 
    }).populate('organizationId');
  }

  static async updateStatus(id, status, options = {}) {
    return Membership.findByIdAndUpdate(id, { status }, { new: true, ...options });
  }
}

module.exports = MembershipRepository;

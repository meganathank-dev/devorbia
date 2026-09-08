const Invitation = require('../models/invitation.model');
const { INVITATION_STATUS } = require('../utils/constants');

class InvitationRepository {
  static async create(invitationData, options = {}) {
    const invitation = new Invitation(invitationData);
    return invitation.save(options);
  }

  static async findByTokenHash(tokenHash) {
    return Invitation.findOne({ tokenHash });
  }

  static async findPendingByEmailAndOrg(email, organizationId) {
    return Invitation.findOne({ 
      email, 
      organizationId,
      status: INVITATION_STATUS.PENDING
    });
  }

  static async markAccepted(id, options = {}) {
    return Invitation.findByIdAndUpdate(id, {
      status: INVITATION_STATUS.ACCEPTED,
      acceptedAt: new Date()
    }, { new: true, ...options });
  }

  static async markRevoked(id, options = {}) {
    return Invitation.findByIdAndUpdate(id, {
      status: INVITATION_STATUS.REVOKED,
      revokedAt: new Date()
    }, { new: true, ...options });
  }

  static async listByOrganization(organizationId) {
    return Invitation.find({ organizationId }).sort({ createdAt: -1 });
  }
}

module.exports = InvitationRepository;

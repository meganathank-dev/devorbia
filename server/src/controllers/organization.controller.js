const OrganizationService = require('../services/organization.service');
const MembershipRepository = require('../repositories/membership.repository');
const { hashPassword } = require('../utils/password.util');

class OrganizationController {
  
  /**
   * Get the current user's active organizations.
   */
  static async getMyOrganizations(req, res, next) {
    try {
      const memberships = await MembershipRepository.findActiveMembershipsForUser(req.user.id);
      
      const organizations = memberships.map(m => ({
        id: m.organizationId._id,
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        role: m.role,
        joinedAt: m.joinedAt,
      }));

      return res.status(200).json({
        success: true,
        data: {
          organizations
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrganizationController;

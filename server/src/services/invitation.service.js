const InvitationRepository = require('../repositories/invitation.repository');
const MembershipRepository = require('../repositories/membership.repository');
const UserRepository = require('../repositories/user.repository');
const OrganizationRepository = require('../repositories/organization.repository');
const { 
  generateInvitationToken, 
  hashInvitationToken 
} = require('../utils/invitation.util');
const { hashPassword } = require('../utils/password.util');
const { INVITATION_STATUS, ACCOUNT_STATUS, ORG_STATUS, ERROR_CODES } = require('../utils/constants');

class InvitationService {
  /**
   * Create a new invitation.
   */
  static async createInvitation(organizationId, email, role, invitedById, expiresInDays = 7) {
    // 1. Verify organization exists and is active
    const org = await OrganizationRepository.findById(organizationId);
    if (!org || org.status !== ORG_STATUS.ACTIVE) {
      const error = new Error('Organization not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    // 2. Check if there's already a pending invitation for this email in this org
    const existing = await InvitationRepository.findPendingByEmailAndOrg(email, organizationId);
    if (existing) {
      // Revoke the old one
      await InvitationRepository.markRevoked(existing._id);
    }

    // 3. Check if user is already a member
    const user = await UserRepository.findByNormalizedEmail(email);
    if (user) {
      const membership = await MembershipRepository.findByUserAndOrganization(user._id, organizationId);
      if (membership) {
        const error = new Error('User is already a member of this organization');
        error.statusCode = 400;
        throw error;
      }
    }

    // 4. Generate token and hash
    const rawToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);

    // 5. Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // 6. Save invitation
    const invitation = await InvitationRepository.create({
      organizationId,
      email,
      role,
      tokenHash,
      invitedBy: invitedById,
      expiresAt,
    });

    // In a real application, we would send an email here.
    // For Phase 1C, we will return the raw token so it can be displayed/logged for development.
    return {
      invitation,
      rawToken,
    };
  }

  /**
   * Accept an invitation and provision the account/membership.
   */
  static async acceptInvitation(rawToken, password) {
    const tokenHash = hashInvitationToken(rawToken);
    
    // 1. Find the invitation
    const invitation = await InvitationRepository.findByTokenHash(tokenHash);
    
    if (!invitation) {
      const error = new Error('Invalid invitation token');
      error.statusCode = 400;
      error.code = 'INVALID_INVITATION';
      throw error;
    }

    // 2. Validate invitation state
    if (invitation.status === INVITATION_STATUS.ACCEPTED) {
      const error = new Error('Invitation already accepted');
      error.statusCode = 400;
      throw error;
    }
    if (invitation.status === INVITATION_STATUS.REVOKED) {
      const error = new Error('Invitation has been revoked');
      error.statusCode = 400;
      throw error;
    }
    if (new Date() > invitation.expiresAt) {
      const error = new Error('Invitation has expired');
      error.statusCode = 400;
      throw error;
    }

    // 3. Validate organization
    const org = await OrganizationRepository.findById(invitation.organizationId);
    if (!org || org.status !== ORG_STATUS.ACTIVE) {
      const error = new Error('Organization is no longer active');
      error.statusCode = 400;
      throw error;
    }

    // 4. Create or find User
    let user = await UserRepository.findByNormalizedEmail(invitation.email);
    if (!user) {
      if (!password) {
        const error = new Error('Password is required for new accounts');
        error.statusCode = 400;
        throw error;
      }
      const passwordHash = await hashPassword(password);
      user = await UserRepository.create({
        email: invitation.email,
        passwordHash,
        status: ACCOUNT_STATUS.ACTIVE,
      });
    }

    // 5. Create Membership
    try {
      await MembershipRepository.create({
        userId: user._id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate membership
        const error = new Error('User is already a member of this organization');
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }

    // 6. Mark Invitation as Accepted
    await InvitationRepository.markAccepted(invitation._id);

    return { user, organization: org };
  }
  
  static async getInvitationDetails(rawToken) {
    const tokenHash = hashInvitationToken(rawToken);
    const invitation = await InvitationRepository.findByTokenHash(tokenHash);
    if (!invitation || invitation.status !== INVITATION_STATUS.PENDING || new Date() > invitation.expiresAt) {
      const error = new Error('Invalid, expired, or unavailable invitation');
      error.statusCode = 404;
      throw error;
    }
    
    const org = await OrganizationRepository.findById(invitation.organizationId);
    
    return {
      email: invitation.email,
      role: invitation.role,
      organizationName: org.name,
    };
  }
}

module.exports = InvitationService;

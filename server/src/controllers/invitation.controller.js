const InvitationService = require('../services/invitation.service');
const InvitationRepository = require('../repositories/invitation.repository');

class InvitationController {
  
  /**
   * Create a new invitation for an organization.
   */
  static async createInvitation(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { email, role } = req.body;
      const invitedById = req.user.id;

      const { invitation, rawToken } = await InvitationService.createInvitation(
        organizationId,
        email,
        role,
        invitedById
      );

      return res.status(201).json({
        success: true,
        data: {
          message: 'Invitation created successfully',
          // Only return rawToken for development. In production, this would be emailed and not returned.
          // Since this is Phase 1C and no email provider is configured, we return it.
          invitationUrl: `/accept-invite/${rawToken}`, 
          rawToken, 
          invitation: {
            id: invitation._id,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            status: invitation.status,
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invitation details securely via token (before accepting).
   */
  static async getInvitation(req, res, next) {
    try {
      const { token } = req.params;
      
      const details = await InvitationService.getInvitationDetails(token);

      return res.status(200).json({
        success: true,
        data: {
          invitation: details
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept an invitation.
   */
  static async acceptInvitation(req, res, next) {
    try {
      const { token } = req.params;
      const { password } = req.body; // Only needed if creating a new user

      const { user, organization } = await InvitationService.acceptInvitation(token, password);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Invitation accepted successfully',
          organization: {
            id: organization._id,
            name: organization.name,
          },
          user: {
            id: user._id,
            email: user.email,
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a pending invitation.
   */
  static async revokeInvitation(req, res, next) {
    try {
      const { invitationId } = req.params;
      
      await InvitationRepository.markRevoked(invitationId);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Invitation revoked successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InvitationController;

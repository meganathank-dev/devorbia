const express = require('express');
const InvitationController = require('../controllers/invitation.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireOrganizationMembership, requireOrganizationRole } = require('../middleware/org-auth.middleware');
const { ORG_ROLES } = require('../utils/constants');

const router = express.Router();

/**
 * Public/Unauthenticated Endpoints
 */
// Get invitation details via token
router.get('/invitations/:token', InvitationController.getInvitation);

// Accept invitation
router.post('/invitations/:token/accept', InvitationController.acceptInvitation);

/**
 * Protected Endpoints (Require Auth & Organization Membership)
 * Note: These routes are mounted under /api/v1/organizations in app.js, 
 * but to keep them grouped, we can define the full path or use router level mounting.
 * Here we expect these routes to be mounted at /api/v1
 */

// Create invitation (Requires OWNER or ADMIN)
router.post(
  '/organizations/:organizationId/invitations',
  requireAuth,
  requireOrganizationMembership,
  requireOrganizationRole(ORG_ROLES.OWNER, ORG_ROLES.ADMIN),
  InvitationController.createInvitation
);

// Revoke invitation (Requires OWNER or ADMIN)
router.post(
  '/organizations/:organizationId/invitations/:invitationId/revoke',
  requireAuth,
  requireOrganizationMembership,
  requireOrganizationRole(ORG_ROLES.OWNER, ORG_ROLES.ADMIN),
  InvitationController.revokeInvitation
);

module.exports = router;

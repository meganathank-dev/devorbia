const MembershipRepository = require('../repositories/membership.repository');
const OrganizationRepository = require('../repositories/organization.repository');
const { ORG_STATUS, ERROR_CODES } = require('../utils/constants');

/**
 * Middleware to require that the authenticated user is an active member
 * of the organization specified in req.params.organizationId.
 */
const requireOrganizationMembership = async (req, res, next) => {
  try {
    // 1. Ensure user is authenticated (auth.middleware.js should run before this)
    if (!req.user || !req.user.id) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      error.code = ERROR_CODES.AUTHENTICATION_REQUIRED;
      return next(error);
    }

    const { organizationId } = req.params;
    if (!organizationId) {
      const error = new Error('Organization ID is required');
      error.statusCode = 400;
      error.code = ERROR_CODES.VALIDATION_ERROR;
      return next(error);
    }

    // 2. Validate Organization
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.NOT_FOUND;
      return next(error);
    }
    
    if (organization.status !== ORG_STATUS.ACTIVE) {
      const error = new Error('Organization is suspended or inactive');
      error.statusCode = 403;
      error.code = ERROR_CODES.FORBIDDEN;
      return next(error);
    }

    // 3. Find User's active membership
    const membership = await MembershipRepository.findActiveMembership(req.user.id, organizationId);
    if (!membership) {
      const error = new Error('You do not have access to this organization');
      error.statusCode = 403;
      error.code = ERROR_CODES.FORBIDDEN;
      return next(error);
    }

    // 4. Attach trusted context
    req.organization = {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
    };
    req.membership = {
      id: membership._id.toString(),
      role: membership.role,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware factory to enforce organization-level roles.
 * Must be used AFTER requireOrganizationMembership.
 * 
 * @param {...string} allowedRoles - e.g., ORG_ROLES.OWNER, ORG_ROLES.ADMIN
 */
const requireOrganizationRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.membership || !req.membership.role) {
      const error = new Error('Organization membership context missing');
      error.statusCode = 403;
      error.code = ERROR_CODES.FORBIDDEN;
      return next(error);
    }

    if (!allowedRoles.includes(req.membership.role)) {
      const error = new Error('Insufficient organization privileges');
      error.statusCode = 403;
      error.code = ERROR_CODES.FORBIDDEN;
      return next(error);
    }

    next();
  };
};

module.exports = {
  requireOrganizationMembership,
  requireOrganizationRole,
};

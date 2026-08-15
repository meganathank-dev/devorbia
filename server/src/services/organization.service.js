import * as organizationRepository from '../repositories/organization.repository.js';
import { ConflictError, NotFoundError } from '../errors/app.error.js';

/**
 * Create a new organization.
 *
 * SECURITY: Only super_admin can reach this service via the controller.
 *
 * @param {object} data
 * @param {string} data.name
 * @param {string} [data.domain]
 * @returns {Promise<object>} The created organization
 */
export const createOrganization = async ({ name, domain }) => {
  // Check for duplicate domain if provided
  if (domain) {
    const existing = await organizationRepository.findByDomain(domain);
    if (existing) {
      throw new ConflictError('An organization with this domain already exists');
    }
  }

  const org = await organizationRepository.createOrganization({ name, domain });

  return org;
};

/**
 * Get an organization by ID with strict tenant isolation.
 *
 * @param {string} id - The organization ID to retrieve
 * @param {string} tenantId - The authenticated user's organization ID
 * @returns {Promise<object>}
 */
export const getOrganizationById = async (id, tenantId) => {
  // Tenant Isolation:
  // We only allow fetching if the requested ID matches the user's tenantId.
  // super_admin might not have a tenantId, but they usually won't call this
  // endpoint for themselves unless we explicitly design a cross-tenant admin view.
  if (String(id) !== String(tenantId)) {
    throw new NotFoundError('Organization not found');
  }

  const org = await organizationRepository.findById(id);

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  return org;
};

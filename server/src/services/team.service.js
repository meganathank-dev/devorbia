import * as teamRepository from '../repositories/team.repository.js';
import * as departmentRepository from '../repositories/department.repository.js';
import * as employeeRepository from '../repositories/employee-profile.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/app.error.js';

/**
 * Create a new team within a department.
 *
 * @param {string} tenantId
 * @param {object} params
 * @returns {Promise<object>}
 */
export const createTeam = async (tenantId, { departmentId, name, description, leaderId }) => {
  // Verify the department belongs to this tenant
  const department = await departmentRepository.findByIdAndOrganization(departmentId, tenantId);
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  try {
    const team = await teamRepository.createTeam({
      organizationId: tenantId,
      departmentId,
      name,
      description,
      leaderId,
    });
    return team;
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A team with this name already exists in this department');
    }
    throw error;
  }
};

/**
 * Get a paginated list of teams for an organization.
 *
 * @param {string} tenantId
 * @param {object} query
 * @returns {Promise<object>}
 */
export const getTeams = async (tenantId, { page = 1, limit = 20, search, departmentId } = {}) => {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10)), 100);
  const safePage = Math.max(1, parseInt(page, 10));
  const skip = (safePage - 1) * safeLimit;

  const filters = {};
  if (search) {
    filters.name = { $regex: search, $options: 'i' };
  }
  if (departmentId) {
    filters.departmentId = departmentId;
  }

  const { data, total } = await teamRepository.findManyByOrganization(tenantId, filters, {
    skip,
    limit: safeLimit,
  });

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

/**
 * Get a team by ID, enforcing tenant isolation.
 *
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<object>}
 */
export const getTeamById = async (id, tenantId) => {
  const team = await teamRepository.findByIdAndOrganization(id, tenantId);
  if (!team) {
    throw new NotFoundError('Team not found');
  }
  return team;
};

/**
 * Update a team.
 *
 * @param {string} id
 * @param {string} tenantId
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateTeam = async (id, tenantId, data) => {
  try {
    const team = await teamRepository.updateTeam(id, tenantId, data);
    if (!team) {
      throw new NotFoundError('Team not found');
    }
    return team;
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A team with this name already exists in this department');
    }
    throw error;
  }
};

/**
 * Delete a team.
 * Blocks deletion if the team has employees assigned to it.
 *
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<void>}
 */
export const deleteTeam = async (id, tenantId) => {
  // Check for assigned employees
  const { total: employeeCount } = await employeeRepository.findManyByOrganization(
    tenantId,
    { teamId: id },
    { skip: 0, limit: 1 }
  );
  if (employeeCount > 0) {
    throw new BadRequestError('Cannot delete a team that has members. Reassign members first.');
  }

  const deleted = await teamRepository.deleteTeam(id, tenantId);
  if (!deleted) {
    throw new NotFoundError('Team not found');
  }
};

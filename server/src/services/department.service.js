import * as departmentRepository from '../repositories/department.repository.js';
import * as teamRepository from '../repositories/team.repository.js';
import * as employeeRepository from '../repositories/employee-profile.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/app.error.js';

/**
 * Create a new department within an organization.
 *
 * @param {string} tenantId
 * @param {object} params
 * @returns {Promise<object>}
 */
export const createDepartment = async (tenantId, { name, description, managerId }) => {
  try {
    const department = await departmentRepository.createDepartment({
      organizationId: tenantId,
      name,
      description,
      managerId,
    });
    return department;
  } catch (error) {
    // Mongoose duplicate key error (unique index on organizationId + name)
    if (error.code === 11000) {
      throw new ConflictError('A department with this name already exists in your organization');
    }
    throw error;
  }
};

/**
 * Get a paginated list of departments for an organization.
 *
 * @param {string} tenantId
 * @param {object} query
 * @returns {Promise<object>}
 */
export const getDepartments = async (tenantId, { page = 1, limit = 20, search } = {}) => {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10)), 100);
  const safePage = Math.max(1, parseInt(page, 10));
  const skip = (safePage - 1) * safeLimit;

  const filters = {};
  if (search) {
    filters.name = { $regex: search, $options: 'i' };
  }

  const { data, total } = await departmentRepository.findManyByOrganization(tenantId, filters, {
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
 * Get a department by ID, enforcing tenant isolation.
 *
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<object>}
 */
export const getDepartmentById = async (id, tenantId) => {
  const department = await departmentRepository.findByIdAndOrganization(id, tenantId);
  if (!department) {
    throw new NotFoundError('Department not found');
  }
  return department;
};

/**
 * Update a department.
 *
 * @param {string} id
 * @param {string} tenantId
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateDepartment = async (id, tenantId, data) => {
  try {
    const department = await departmentRepository.updateDepartment(id, tenantId, data);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    return department;
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A department with this name already exists in your organization');
    }
    throw error;
  }
};

/**
 * Delete a department.
 * Blocks deletion if the department has teams or employees assigned to it.
 *
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<void>}
 */
export const deleteDepartment = async (id, tenantId) => {
  // Check for child teams
  const teamCount = await teamRepository.countByDepartment(id, tenantId);
  if (teamCount > 0) {
    throw new BadRequestError('Cannot delete a department that has teams. Remove or reassign teams first.');
  }

  // Check for assigned employees
  const { total: employeeCount } = await employeeRepository.findManyByOrganization(
    tenantId,
    { departmentId: id },
    { skip: 0, limit: 1 }
  );
  if (employeeCount > 0) {
    throw new BadRequestError('Cannot delete a department that has employees. Reassign employees first.');
  }

  const deleted = await departmentRepository.deleteDepartment(id, tenantId);
  if (!deleted) {
    throw new NotFoundError('Department not found');
  }
};

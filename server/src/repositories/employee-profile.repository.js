import EmployeeProfile from '../models/employee-profile.model.js';

/**
 * Find employees within a specific organization.
 *
 * SECURITY: organizationId is required to prevent cross-tenant access.
 *
 * @param {string} organizationId
 * @param {object} filters
 * @param {object} pagination
 * @param {number} pagination.skip
 * @param {number} pagination.limit
 * @returns {Promise<{ data: object[], total: number }>}
 */
export const findManyByOrganization = async (organizationId, filters = {}, { skip = 0, limit = 20 } = {}) => {
  const query = { organizationId, ...filters };

  const [data, total] = await Promise.all([
    EmployeeProfile.find(query)
      .populate('user', 'email employeeId role accountStatus')
      .populate('departmentId', '_id name')
      .populate('teamId', '_id name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec(),
    EmployeeProfile.countDocuments(query).exec(),
  ]);

  return { data, total };
};

/**
 * Find a single employee profile by ID and organization ID.
 *
 * SECURITY: organizationId is required to prevent IDOR.
 *
 * @param {string} id - EmployeeProfile ObjectId
 * @param {string} organizationId - Authenticated user's organizationId
 * @returns {Promise<object|null>}
 */
export const findByIdAndOrganization = async (id, organizationId) => {
  return EmployeeProfile.findOne({ _id: id, organizationId })
    .populate('user', 'email employeeId role accountStatus')
    .populate('departmentId', '_id name')
    .populate('teamId', '_id name')
    .exec();
};

/**
 * Create an employee profile.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createProfile = async (data) => {
  return EmployeeProfile.create(data);
};

/**
 * Update an employee profile.
 *
 * SECURITY: organizationId is required to prevent IDOR.
 *
 * @param {string} id
 * @param {string} organizationId
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateProfile = async (id, organizationId, data) => {
  return EmployeeProfile.findOneAndUpdate(
    { _id: id, organizationId },
    { $set: data },
    { new: true }
  ).exec();
};

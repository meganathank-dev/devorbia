import Department from '../models/department.model.js';

/**
 * Find departments within a specific organization.
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
    Department.find(query)
      .populate('managerId', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .exec(),
    Department.countDocuments(query).exec(),
  ]);

  return { data, total };
};

/**
 * Find a single department by ID and organization ID.
 *
 * SECURITY: organizationId is required to prevent IDOR.
 *
 * @param {string} id - Department ObjectId
 * @param {string} organizationId
 * @returns {Promise<object|null>}
 */
export const findByIdAndOrganization = async (id, organizationId) => {
  return Department.findOne({ _id: id, organizationId })
    .populate('managerId', 'firstName lastName')
    .exec();
};

/**
 * Create a department.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createDepartment = async (data) => {
  return Department.create(data);
};

/**
 * Update a department.
 *
 * SECURITY: organizationId is required to prevent IDOR.
 *
 * @param {string} id
 * @param {string} organizationId
 * @param {object} data
 * @returns {Promise<object|null>}
 */
export const updateDepartment = async (id, organizationId, data) => {
  return Department.findOneAndUpdate(
    { _id: id, organizationId },
    { $set: data },
    { new: true }
  )
    .populate('managerId', 'firstName lastName')
    .exec();
};

/**
 * Delete a department.
 *
 * SECURITY: organizationId is required to prevent IDOR.
 *
 * @param {string} id
 * @param {string} organizationId
 * @returns {Promise<object|null>}
 */
export const deleteDepartment = async (id, organizationId) => {
  return Department.findOneAndDelete({ _id: id, organizationId }).exec();
};

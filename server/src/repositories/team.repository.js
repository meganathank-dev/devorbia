import Team from '../models/team.model.js';

/**
 * Find teams within a specific organization.
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
    Team.find(query)
      .populate('departmentId', 'name')
      .populate('leaderId', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .exec(),
    Team.countDocuments(query).exec(),
  ]);

  return { data, total };
};

/**
 * Find a single team by ID and organization ID.
 *
 * SECURITY: organizationId is required to prevent IDOR.
 *
 * @param {string} id - Team ObjectId
 * @param {string} organizationId
 * @returns {Promise<object|null>}
 */
export const findByIdAndOrganization = async (id, organizationId) => {
  return Team.findOne({ _id: id, organizationId })
    .populate('departmentId', 'name')
    .populate('leaderId', 'firstName lastName')
    .exec();
};

/**
 * Count teams belonging to a specific department.
 *
 * @param {string} departmentId
 * @param {string} organizationId
 * @returns {Promise<number>}
 */
export const countByDepartment = async (departmentId, organizationId) => {
  return Team.countDocuments({ departmentId, organizationId }).exec();
};

/**
 * Create a team.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createTeam = async (data) => {
  return Team.create(data);
};

/**
 * Update a team.
 *
 * SECURITY: organizationId is required to prevent IDOR.
 *
 * @param {string} id
 * @param {string} organizationId
 * @param {object} data
 * @returns {Promise<object|null>}
 */
export const updateTeam = async (id, organizationId, data) => {
  return Team.findOneAndUpdate(
    { _id: id, organizationId },
    { $set: data },
    { new: true }
  )
    .populate('departmentId', 'name')
    .populate('leaderId', 'firstName lastName')
    .exec();
};

/**
 * Delete a team.
 *
 * SECURITY: organizationId is required to prevent IDOR.
 *
 * @param {string} id
 * @param {string} organizationId
 * @returns {Promise<object|null>}
 */
export const deleteTeam = async (id, organizationId) => {
  return Team.findOneAndDelete({ _id: id, organizationId }).exec();
};

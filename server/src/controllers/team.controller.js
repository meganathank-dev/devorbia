import { StatusCodes } from 'http-status-codes';
import { sendSuccess } from '../utils/response.js';
import * as teamService from '../services/team.service.js';

/**
 * Create a new team.
 * POST /api/v1/teams
 */
export const createTeam = async (req, res, next) => {
  try {
    const team = await teamService.createTeam(req.tenantId, req.body);

    sendSuccess(res, {
      data: team,
      message: 'Team created successfully',
      statusCode: StatusCodes.CREATED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get teams for the current organization.
 * GET /api/v1/teams
 */
export const getTeams = async (req, res, next) => {
  try {
    const result = await teamService.getTeams(req.tenantId, req.query);

    sendSuccess(res, {
      data: result.data,
      pagination: result.pagination,
      message: 'Teams retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a team by ID.
 * GET /api/v1/teams/:id
 */
export const getTeamById = async (req, res, next) => {
  try {
    const team = await teamService.getTeamById(req.params.id, req.tenantId);

    sendSuccess(res, {
      data: team,
      message: 'Team retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a team.
 * PUT /api/v1/teams/:id
 */
export const updateTeam = async (req, res, next) => {
  try {
    const team = await teamService.updateTeam(req.params.id, req.tenantId, req.body);

    sendSuccess(res, {
      data: team,
      message: 'Team updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a team.
 * DELETE /api/v1/teams/:id
 */
export const deleteTeam = async (req, res, next) => {
  try {
    await teamService.deleteTeam(req.params.id, req.tenantId);

    sendSuccess(res, {
      message: 'Team deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

import { StatusCodes } from 'http-status-codes';
import { sendSuccess } from '../utils/response.js';
import * as departmentService from '../services/department.service.js';

/**
 * Create a new department.
 * POST /api/v1/departments
 */
export const createDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.createDepartment(req.tenantId, req.body);

    sendSuccess(res, {
      data: department,
      message: 'Department created successfully',
      statusCode: StatusCodes.CREATED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get departments for the current organization.
 * GET /api/v1/departments
 */
export const getDepartments = async (req, res, next) => {
  try {
    const result = await departmentService.getDepartments(req.tenantId, req.query);

    sendSuccess(res, {
      data: result.data,
      pagination: result.pagination,
      message: 'Departments retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a department by ID.
 * GET /api/v1/departments/:id
 */
export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id, req.tenantId);

    sendSuccess(res, {
      data: department,
      message: 'Department retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a department.
 * PUT /api/v1/departments/:id
 */
export const updateDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.tenantId, req.body);

    sendSuccess(res, {
      data: department,
      message: 'Department updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a department.
 * DELETE /api/v1/departments/:id
 */
export const deleteDepartment = async (req, res, next) => {
  try {
    await departmentService.deleteDepartment(req.params.id, req.tenantId);

    sendSuccess(res, {
      message: 'Department deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

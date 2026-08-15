import { StatusCodes } from 'http-status-codes';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import * as employeeService from '../services/employee-profile.service.js';

/**
 * Create a new employee in the current organization.
 * POST /api/v1/employees
 */
export const createEmployee = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const employeeProfile = await employeeService.createEmployee(tenantId, req.body);

    sendSuccess(res, {
      data: employeeProfile,
      message: 'Employee created successfully',
      statusCode: StatusCodes.CREATED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get employees for the current organization.
 * GET /api/v1/employees
 */
export const getEmployees = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const result = await employeeService.getEmployees(tenantId, req.query);

    sendPaginated(res, {
      data: result.data,
      pagination: result.pagination,
      message: 'Employees retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get an employee by ID in the current organization.
 * GET /api/v1/employees/:id
 */
export const getEmployeeById = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const employee = await employeeService.getEmployeeById(req.params.id, tenantId);

    sendSuccess(res, {
      data: employee,
      message: 'Employee retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign an employee to a department and/or team.
 * PATCH /api/v1/employees/:id/assign
 */
export const assignEmployee = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const employee = await employeeService.assignEmployee(req.params.id, tenantId, req.body);

    sendSuccess(res, {
      data: employee,
      message: 'Employee assignment updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

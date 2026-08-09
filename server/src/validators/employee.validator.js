import { z } from 'zod';
import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ID format',
});

export const createEmployeeSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee ID is required').max(50, 'Employee ID must be 50 characters or less'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be 128 characters or less'),
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name must be 50 characters or less'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name must be 50 characters or less'),
  title: z.string().trim().max(100).optional(),
  skills: z.array(z.string().trim()).optional(),
  role: z.enum([ROLES.EMPLOYEE, ROLES.TEAM_LEADER, ROLES.PROJECT_MANAGER]).optional(),
});

export const getEmployeesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().trim().max(100).optional(),
});

export const assignEmployeeSchema = z.object({
  departmentId: objectId.nullable().optional(),
  teamId: objectId.nullable().optional(),
});

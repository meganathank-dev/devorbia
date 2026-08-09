import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ID format',
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').optional(),
  managerId: objectId.optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(100, 'Name must be 100 characters or less').optional(),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').nullable().optional(),
  managerId: objectId.nullable().optional(),
});

export const getDepartmentsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().trim().max(100).optional(),
});

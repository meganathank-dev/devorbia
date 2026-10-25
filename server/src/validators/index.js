import { z } from 'zod';
import { ROLES, STATUSES, PRIORITIES } from '../utils/domain.js';
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record ID.');
const nullableId = objectId.nullable().optional();
const name = z.string().trim().min(2).max(100);
export const email = z.string().trim().email().max(254).transform(v => v.toLowerCase());
export const password = z.string().min(12, 'Use at least 12 characters.').max(128);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Invalid calendar date.');
const tags = z.array(z.string().trim().min(1).max(40)).max(30);
const ids = z.array(objectId).max(100).refine(v => new Set(v).size === v.length, 'Duplicate selections.');
const url = z.string().max(300).refine(v => !v || /^https?:\/\//.test(v), 'Use an http or https URL.').refine(v => {
  try {
    return !v || Boolean(new URL(v));
  } catch {
    return false;
  }
}, 'Invalid URL.');
export const revision = z.number().int().min(0);
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128)
}).strict();
export const recoverySchema = z.object({
  email
}).strict();
export const activateSchema = z.object({
  token: z.string().min(40).max(100),
  password
}).strict();
export const departmentSchema = z.object({
  name,
  description: z.string().max(2000).default(''),
  headId: nullableId,
  archived: z.boolean().optional()
}).strict();
export const teamSchema = z.object({
  name,
  description: z.string().max(2000).default(''),
  departmentId: objectId,
  leaderId: nullableId,
  archived: z.boolean().optional()
}).strict();
export const employeeSchema = z.object({
  name,
  email,
  jobTitle: z.string().trim().max(120).default(''),
  role: z.enum(ROLES.slice(2)),
  departmentId: nullableId,
  teamId: nullableId,
  reportsToId: nullableId,
  skills: tags.default([]),
  experienceYears: z.number().min(0).max(60).default(0),
  hoursPerWeek: z.number().min(1).max(80).optional(),
  joiningDate: date,
  profileImage: url.optional()
}).strict();
export const employeePatch = employeeSchema.omit({
  email: true
}).partial().extend({
  revision,
  status: z.enum(['ACTIVE', 'DISABLED']).optional()
}).strict();
export const projectSchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9-]{1,19}$/).transform(v => v.toUpperCase()),
  description: z.string().max(5000).default(''),
  managerId: objectId,
  teamIds: ids.default([]),
  memberIds: ids.default([]),
  requiredSkills: tags.default([]),
  tags: tags.default([]),
  startDate: date,
  dueDate: date,
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  archived: z.boolean().optional()
}).strict();
export const taskSchema = z.object({
  projectId: objectId,
  title: z.string().trim().min(2).max(180),
  description: z.string().max(8000).default(''),
  assigneeId: nullableId,
  teamId: nullableId,
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  startDate: date,
  dueDate: date,
  estimatedHours: z.number().min(.25).max(1000).default(8),
  remainingHours: z.number().min(0).max(1000).optional(),
  complexity: z.number().int().min(1).max(5).default(1),
  requiredSkills: tags.default([]),
  tags: tags.default([]),
  dependencies: z.array(objectId).max(20).default([]),
  blockedReason: z.string().max(1000).default('')
}).strict();
export const taskPatch = taskSchema.omit({
  projectId: true
}).partial().extend({
  revision,
  status: z.enum(STATUSES).optional()
}).strict();
export const leaveSchema = z.object({
  type: z.enum(['PAID', 'SICK', 'UNPAID']),
  startDate: date,
  endDate: date,
  reason: z.string().trim().min(4).max(2000)
}).strict();
export const leaveDecision = z.object({
  revision,
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  decisionNote: z.string().max(2000).default('')
}).strict();
export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,49}$/),
  email,
  description: z.string().max(2000).default(''),
  website: url.default(''),
  adminName: name,
  adminEmail: email
}).strict();
export const organizationPatch = organizationSchema.omit({
  adminName: true,
  adminEmail: true,
  slug: true
}).partial().extend({
  active: z.boolean().optional(),
  revision
}).strict();
export const settingsSchema = z.object({
  revision,
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2000),
  email,
  website: url,
  logoUrl: url.optional(),
  leaveDelegateId: nullableId,
  settings: z.object({
    hoursPerDay: z.number().min(1).max(12),
    workingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(v => new Set(v).size === v.length),
    annualLeaveDays: z.number().int().min(0).max(100)
  }).strict()
}).strict();
export const listSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).default(''),
  sort: z.enum(['createdAt', 'name', 'title', 'dueDate', 'priority', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: z.string().max(30).optional(),
  priority: z.enum(PRIORITIES).optional(),
  role: z.enum(ROLES).optional(),
  projectId: objectId.optional(),
  teamId: objectId.optional(),
  departmentId: objectId.optional(),
  assigneeId: objectId.optional(),
  managerId: objectId.optional(),
  archived: z.enum(['true', 'false']).optional()
}).strict();
export const parse = (schema, value) => schema.parse(value);
export const patchSchema = schema => schema.partial().extend({
  revision
}).strict();

import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/authorize.middleware.js';
import { requireOrganization } from '../../middleware/tenant.middleware.js';
import { createEmployeeSchema, getEmployeesQuerySchema, assignEmployeeSchema } from '../../validators/employee.validator.js';
import { objectIdSchema } from '../../validators/common.validator.js';
import { createEmployee, getEmployees, getEmployeeById, assignEmployee } from '../../controllers/employee-profile.controller.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Apply auth and tenant isolation to all employee routes
router.use(authenticate);
router.use(requireOrganization);

// ── Read Routes (All Tenant Users) ──────────────────────────────
router.get('/', validate({ query: getEmployeesQuerySchema }), getEmployees);
router.get('/:id', validate({ params: objectIdSchema }), getEmployeeById);

// ── Write Routes (Admin/Managers Only) ──────────────────────────
router.post(
  '/',
  authorizeRoles(ROLES.ORGANIZATION_ADMIN, ROLES.PROJECT_MANAGER),
  validate({ body: createEmployeeSchema }),
  createEmployee
);

// ── Assignment Route (Admin/Managers Only) ──────────────────────
router.patch(
  '/:id/assign',
  authorizeRoles(ROLES.ORGANIZATION_ADMIN, ROLES.PROJECT_MANAGER),
  validate({ params: objectIdSchema, body: assignEmployeeSchema }),
  assignEmployee
);

export default router;

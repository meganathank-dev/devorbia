import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/authorize.middleware.js';
import { requireOrganization } from '../../middleware/tenant.middleware.js';
import { createDepartmentSchema, updateDepartmentSchema, getDepartmentsQuerySchema } from '../../validators/department.validator.js';
import { objectIdSchema } from '../../validators/common.validator.js';
import { createDepartment, getDepartments, getDepartmentById, updateDepartment, deleteDepartment } from '../../controllers/department.controller.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Apply auth and tenant isolation to all department routes
router.use(authenticate);
router.use(requireOrganization);

// ── Read Routes (All Tenant Users) ──────────────────────────────
router.get('/', validate({ query: getDepartmentsQuerySchema }), getDepartments);
router.get('/:id', validate({ params: objectIdSchema }), getDepartmentById);

// ── Write Routes (Admin Only) ───────────────────────────────────
router.post(
  '/',
  authorizeRoles(ROLES.ORGANIZATION_ADMIN),
  validate({ body: createDepartmentSchema }),
  createDepartment
);

router.put(
  '/:id',
  authorizeRoles(ROLES.ORGANIZATION_ADMIN),
  validate({ params: objectIdSchema, body: updateDepartmentSchema }),
  updateDepartment
);

router.delete(
  '/:id',
  authorizeRoles(ROLES.ORGANIZATION_ADMIN),
  validate({ params: objectIdSchema }),
  deleteDepartment
);

export default router;

import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/authorize.middleware.js';
import { requireOrganization } from '../../middleware/tenant.middleware.js';
import { createTeamSchema, updateTeamSchema, getTeamsQuerySchema } from '../../validators/team.validator.js';
import { objectIdSchema } from '../../validators/common.validator.js';
import { createTeam, getTeams, getTeamById, updateTeam, deleteTeam } from '../../controllers/team.controller.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Apply auth and tenant isolation to all team routes
router.use(authenticate);
router.use(requireOrganization);

// ── Read Routes (All Tenant Users) ──────────────────────────────
router.get('/', validate({ query: getTeamsQuerySchema }), getTeams);
router.get('/:id', validate({ params: objectIdSchema }), getTeamById);

// ── Write Routes (Admin/Managers) ───────────────────────────────
router.post(
  '/',
  authorizeRoles(ROLES.ORGANIZATION_ADMIN, ROLES.PROJECT_MANAGER),
  validate({ body: createTeamSchema }),
  createTeam
);

router.put(
  '/:id',
  authorizeRoles(ROLES.ORGANIZATION_ADMIN, ROLES.PROJECT_MANAGER),
  validate({ params: objectIdSchema, body: updateTeamSchema }),
  updateTeam
);

router.delete(
  '/:id',
  authorizeRoles(ROLES.ORGANIZATION_ADMIN),
  validate({ params: objectIdSchema }),
  deleteTeam
);

export default router;

import { Router } from 'express';
import healthRoute from './health.route.js';
import authRoute from './auth.route.js';
import organizationRoute from './organization.route.js';
import employeeRoute from './employee.route.js';
import departmentRoute from './department.route.js';
import teamRoute from './team.route.js';

const router = Router();

router.use('/health', healthRoute);
router.use('/auth', authRoute);
router.use('/organizations', organizationRoute);
router.use('/employees', employeeRoute);
router.use('/departments', departmentRoute);
router.use('/teams', teamRoute);

export default router;

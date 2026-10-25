import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import * as v from '../validators/index.js';
import * as auth from '../services/auth.js';
import * as platform from '../services/platform.js';
import * as resources from '../services/resources.js';
import * as projects from '../services/projects.js';
import * as tasks from '../services/tasks.js';
import * as leave from '../services/leave.js';
import * as ai from '../services/intelligence.js';
import { repository } from '../repositories/tenant.js';
import { requireAuth, tenant, roles } from '../middleware/security.js';
import { respond } from '../controllers/respond.js';
const router = Router(),
  readId = req => v.objectId.parse(req.params.id),
  body = (req, schema) => schema.parse(req.body),
  query = req => v.listSchema.parse(req.query);
const limit = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Try again in 15 minutes.'
    }
  }
});
const limitedAuth = Router();
limitedAuth.use(limit);
limitedAuth.post('/login', respond(async (req, res) => {
  const result = await auth.login(body(req, v.loginSchema));
  auth.writeCookies(res, result);
  return {
    user: result.user,
    csrf: result.csrf
  };
}));
limitedAuth.post('/forgot-password', respond(req => auth.forgotPassword(body(req, v.recoverySchema))));
limitedAuth.post('/reset-password', respond(req => auth.acceptToken(body(req, v.activateSchema), 'RESET')));
limitedAuth.post('/accept-invitation', respond(req => auth.acceptToken(body(req, v.activateSchema), 'INVITATION')));
router.use('/auth', limitedAuth);
router.post('/auth/refresh', rateLimit({
  windowMs: 60000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false
}), respond(async (req, res) => {
  const result = await auth.refresh(req.cookies.do_refresh);
  auth.writeCookies(res, result);
  return {
    user: result.user,
    csrf: result.csrf
  };
}));
router.use(requireAuth);
router.get('/auth/me', respond(req => ({
  user: req.ctx.user,
  employee: req.ctx.employee || null,
  csrf: req.authSession.csrf
})));
router.post('/auth/logout', respond(async (req, res) => {
  await auth.logout(req.authSession._id);
  auth.clearCookies(res);
  return {
    message: 'Signed out.'
  };
}));
router.use('/organizations', roles('SUPER_ADMIN'));
router.get('/organizations', respond(req => platform.listOrganizations(req.ctx, query(req))));
router.post('/organizations', respond(req => platform.createOrganization(req.ctx, body(req, v.organizationSchema)), 201));
router.patch('/organizations/:id', respond(req => platform.updateOrganization(req.ctx, readId(req), body(req, v.organizationPatch))));
router.post('/organizations/:id/resend-invitation', respond(req => platform.resendAdminInvitation(req.ctx, readId(req))));
router.use(tenant);
router.get('/settings', respond(req => req.ctx.organization));
router.patch('/settings', respond(req => platform.saveSettings(req.ctx, body(req, v.settingsSchema))));
router.post('/settings/transfer-admin', respond(async (req, res) => {
  const result = await platform.transferAdmin(req.ctx, body(req, z.object({
    employeeId: v.objectId,
    password: v.password
  }).strict()));
  auth.clearCookies(res);
  return result;
}));
router.get('/notifications/unread-count', respond(async req => ({
  count: await repository(req.ctx, 'Notification').count({
    userId: req.ctx.userId,
    readAt: null
  })
})));
router.post('/notifications/read-all', respond(async req => {
  await repository(req.ctx, 'Notification').update({
    userId: req.ctx.userId,
    readAt: null
  }, {
    $set: {
      readAt: new Date()
    }
  });
  return {
    message: 'All notifications marked as read.'
  };
}));
router.patch('/notifications/:id/read', respond(async req => {
  await resources.getResource(req.ctx, 'Notification', readId(req));
  await repository(req.ctx, 'Notification').update({
    _id: readId(req),
    userId: req.ctx.userId
  }, {
    $set: {
      readAt: new Date()
    }
  });
  return {
    message: 'Marked as read.'
  };
}));
for (const [path, kind] of [['employees', 'Employee'], ['departments', 'Department'], ['teams', 'Team'], ['projects', 'Project'], ['tasks', 'Task'], ['notifications', 'Notification'], ['activity', 'Activity']]) {
  router.get(`/${path}`, respond(req => resources.listResources(req.ctx, kind, query(req))));
  router.get(`/${path}/:id`, respond(req => resources.getResource(req.ctx, kind, readId(req))));
}
router.post('/employees', respond(req => resources.createEmployee(req.ctx, body(req, v.employeeSchema)), 201));
router.patch('/employees/:id', respond(req => resources.updateEmployee(req.ctx, readId(req), body(req, v.employeePatch))));
router.post('/employees/:id/resend-invitation', respond(req => resources.resendInvitation(req.ctx, readId(req))));
for (const [path, kind, schema] of [['departments', 'Department', v.departmentSchema], ['teams', 'Team', v.teamSchema]]) {
  router.post(`/${path}`, respond(req => resources.saveStructure(req.ctx, kind, null, body(req, schema)), 201));
  router.patch(`/${path}/:id`, respond(req => resources.saveStructure(req.ctx, kind, readId(req), body(req, v.patchSchema(schema)))));
}
router.post('/projects', respond(req => projects.saveProject(req.ctx, null, body(req, v.projectSchema)), 201));
router.patch('/projects/:id', respond(req => projects.saveProject(req.ctx, readId(req), body(req, v.patchSchema(v.projectSchema)))));
router.post('/tasks', respond(req => tasks.saveTask(req.ctx, null, body(req, v.taskSchema)), 201));
router.patch('/tasks/:id', respond(req => tasks.saveTask(req.ctx, readId(req), body(req, v.taskPatch))));
router.get('/leave/balance', respond(req => leave.balance(req.ctx)));
router.get('/leave', respond(req => leave.listLeave(req.ctx, query(req))));
router.post('/leave', respond(req => leave.createLeave(req.ctx, body(req, v.leaveSchema)), 201));
router.patch('/leave/:id', respond(req => leave.decideLeave(req.ctx, readId(req), body(req, v.leaveDecision))));
const analysisLimit = rateLimit({
  windowMs: 60000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});
const analysisQuery = z.object({
  projectId: v.objectId.optional()
}).strict();
router.get('/dashboard', analysisLimit, respond(req => ai.overview(req.ctx, analysisQuery.parse(req.query).projectId)));
router.get('/analytics', analysisLimit, respond(req => ai.overview(req.ctx, analysisQuery.parse(req.query).projectId)));
router.use('/ai', analysisLimit);
router.get('/ai/tasks/:id/assignment', respond(req => ai.recommendTask(req.ctx, readId(req))));
router.get('/ai/projects/:id/resources', respond(req => ai.recommendProject(req.ctx, readId(req))));
router.get('/ai/leave/:id/impact', respond(req => ai.analyzeLeave(req.ctx, readId(req))));
router.get('/ai/workload-balancing', roles('ORGANIZATION_ADMIN', 'PROJECT_MANAGER', 'TEAM_LEADER'), respond(req => ai.rebalance(req.ctx)));
export default router;

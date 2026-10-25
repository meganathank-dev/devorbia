import { repository } from '../repositories/tenant.js';
import { tenantTransaction } from '../config/database.js';
import { requireEmployee, requireActive } from './resources.js';
import { activity, notify } from './notifications.js';
import { assert, missing } from '../utils/errors.js';
import { id, same, unique, projectVisible, projectManageable } from '../utils/domain.js';
import { scopeQuery } from './scope.js';
export async function projectMembers(ctx, project, session) {
  const employees = await repository(ctx, 'Employee', session).find({
    status: 'ACTIVE',
    $or: [{
      _id: {
        $in: unique([project.managerId, ...project.memberIds])
      }
    }, {
      teamId: {
        $in: project.teamIds
      }
    }]
  }, {
    limit: 501
  });
  assert(employees.length <= 500, 413, 'Project membership exceeds the 500-person analysis limit.');
  return employees;
}
async function validateProject(ctx, next, session) {
  assert(new Date(next.dueDate) >= new Date(next.startDate), 422, 'The project deadline must be on or after its start date.');
  assert(new Date(next.dueDate) - new Date(next.startDate) <= 366 * 86400000, 422, 'Use project planning windows of at most 366 days.');
  await requireEmployee(ctx, next.managerId, session, ['PROJECT_MANAGER']);
  for (const teamId of next.teamIds) await requireActive(ctx, 'Team', teamId, session);
  for (const memberId of next.memberIds) await requireEmployee(ctx, memberId, session);
  if (ctx.role === 'PROJECT_MANAGER') {
    const employeeScope = await scopeQuery(ctx, 'Employee', session),
      teamScope = await scopeQuery(ctx, 'Team', session);
    const eligibleEmployees = await repository(ctx, 'Employee', session).count({
      $and: [employeeScope, {
        _id: {
          $in: next.memberIds
        }
      }]
    });
    const eligibleTeams = await repository(ctx, 'Team', session).count({
      $and: [teamScope, {
        _id: {
          $in: next.teamIds
        }
      }]
    });
    assert(eligibleEmployees === next.memberIds.length && eligibleTeams === next.teamIds.length, 403, 'Choose members and teams within your authorized scope. An organization administrator can extend project access.');
  }
}
export async function saveProject(ctx, recordId, data) {
  assert(['ORGANIZATION_ADMIN', 'PROJECT_MANAGER'].includes(ctx.role), 403, 'Only project managers and organization administrators can change projects.');
  return tenantTransaction(ctx, async session => {
    const repo = repository(ctx, 'Project', session),
      previous = recordId ? await repo.get(recordId) : null;
    if (previous) assert(projectManageable(ctx, previous), 404, 'This project is unavailable.');
    const {
        revision,
        ...changes
      } = data,
      next = {
        ...previous,
        ...changes
      };
    if (ctx.role === 'PROJECT_MANAGER') assert(same(next.managerId, ctx.employeeId), 403, 'A project manager may create or manage only their own projects.');
    await validateProject(ctx, next, session);
    if (next.archived) assert(['COMPLETED', 'CANCELLED'].includes(next.status), 422, 'Complete or cancel the project before archiving it.');
    if (!previous) assert(!['COMPLETED', 'CANCELLED'].includes(next.status), 422, 'Create a planning or active project first.');
    if (previous) {
      const tasks = await repository(ctx, 'Task', session).find({
        projectId: recordId
      }, {
        limit: 3001
      });
      assert(tasks.length <= 3000, 413, 'Project task limit reached. Archive or split work into smaller projects.');
      const members = await projectMembers(ctx, next, session),
        memberIds = members.map(id);
      for (const task of tasks.filter(t => t.status !== 'DONE')) {
        assert(!task.assigneeId || memberIds.includes(id(task.assigneeId)), 409, 'Reassign unfinished tasks before removing their assignee from the project.');
        assert(!task.teamId || next.teamIds.some(t => same(t, task.teamId)), 409, 'Reassign unfinished tasks before removing their team.');
      }
      if (next.status === 'COMPLETED' && previous.status !== 'COMPLETED') {
        assert(tasks.length > 0 && tasks.every(t => t.status === 'DONE'), 422, 'Every task must be reviewed and done before completing the project.');
        changes.completedAt = new Date();
      }
      if (next.status !== 'COMPLETED') changes.completedAt = null;
      if (next.archived) assert(['COMPLETED', 'CANCELLED'].includes(next.status), 422, 'Complete or cancel the project before archiving it.');
      assert(tasks.every(t => new Date(t.startDate) >= new Date(next.startDate) && new Date(t.dueDate) <= new Date(next.dueDate)), 422, 'Project dates must include all existing task dates.');
    }
    const project = recordId ? await repo.patch(recordId, revision, changes) : await repo.create({
      ...changes,
      createdBy: ctx.userId
    });
    await activity(ctx, `Project ${recordId ? 'updated' : 'created'}`, 'Project', project, session);
    const members = await projectMembers(ctx, project, session);
    await notify(ctx, members.map(id), {
      title: recordId ? 'Project updated' : 'Added to a project',
      message: `${project.name}: ${project.status.replaceAll('_', ' ').toLowerCase()}.`,
      path: `/app/projects/${id(project)}`,
      eventKey: `project:${id(project)}:${project.revision}`
    }, session);
    return project;
  });
}
export async function getProject(ctx, recordId, session) {
  const project = await repository(ctx, 'Project', session).get(recordId);
  if (!projectVisible(ctx, project)) throw missing();
  return project;
}

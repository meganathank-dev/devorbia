import mongoose from 'mongoose';
import { repository } from '../repositories/tenant.js';
import { tenantTransaction } from '../config/database.js';
import { getProject, projectMembers } from './projects.js';
import { activity, notify } from './notifications.js';
import { requireEmployee } from './resources.js';
import { assert, missing } from '../utils/errors.js';
import { id, same, taskManageable, taskVisible, assertAcyclic, validateTransition, unique } from '../utils/domain.js';
export async function saveTask(ctx, recordId, data) {
  return tenantTransaction(ctx, async session => {
    const repo = repository(ctx, 'Task', session),
      previous = recordId ? await repo.get(recordId) : null;
    const project = await getProject(ctx, previous?.projectId || data.projectId, session);
    if (previous && !taskVisible(ctx, project, previous)) throw missing();
    const {
        revision,
        ...changes
      } = data,
      next = {
        ...previous,
        ...changes
      };
    const canManage = taskManageable(ctx, project, previous || next);
    assert(previous || canManage, 403, 'You cannot create tasks in this project or team.');
    assert(!project.archived && !['COMPLETED', 'CANCELLED'].includes(project.status), 409, 'Reopen this project before changing its tasks.');
    if (!canManage) {
      assert(same(previous.assigneeId, ctx.employeeId), 403, 'You can update only your assigned tasks.');
      assert(Object.keys(changes).every(k => ['status', 'remainingHours', 'blockedReason'].includes(k)), 403, 'Employees may change status, remaining effort and blocker notes only.');
    }
    if (ctx.role === 'TEAM_LEADER' && !['ORGANIZATION_ADMIN', 'PROJECT_MANAGER'].includes(ctx.role)) {
      if (canManage) assert(ctx.ledTeamIds.includes(id(next.teamId)), 403, 'Choose a team you lead.');
    }
    // Serialize task mutations with project completion and dependency edits.
    await repository(ctx, 'Project', session).lock(id(project));
    const all = await repo.find({
      projectId: id(project)
    }, {
      limit: 3001
    });
    assert(all.length < 3000 || Boolean(previous), 413, 'A project supports up to 3,000 tasks in this release.');
    assert(all.length <= 3000, 413, 'Project task limit reached.');
    assert(new Date(next.startDate) >= new Date(project.startDate) && new Date(next.dueDate) <= new Date(project.dueDate) && new Date(next.dueDate) >= new Date(next.startDate), 422, 'Task dates must be ordered and fall inside the project dates.');
    if (next.teamId) assert(project.teamIds.some(t => same(t, next.teamId)), 422, 'The selected team is not assigned to this project.');
    const assignee = await requireEmployee(ctx, next.assigneeId, session);
    if (assignee) {
      const members = await projectMembers(ctx, project, session);
      assert(members.some(e => same(e, assignee)), 422, 'Assign this task to an active project member.');
      assert(!next.teamId || same(assignee.teamId, next.teamId), 422, 'The assignee must belong to the selected team.');
    }
    const newId = previous?._id || new mongoose.Types.ObjectId();
    assert((next.dependencies || []).every(dep => all.some(t => same(t, dep))), 422, 'Dependencies must be tasks in the same project.');
    assertAcyclic(all, newId, next.dependencies || []);
    const blocked = Boolean(next.blockedReason?.trim()) || (next.dependencies || []).some(dep => all.find(t => same(t, dep))?.status !== 'DONE');
    const nextStatus = next.status || 'BACKLOG';
    if (previous) validateTransition(previous.status, nextStatus, {
      canReview: canManage,
      blocked
    });
    assert(nextStatus === 'BACKLOG' || nextStatus === 'TODO' || Boolean(assignee), 422, 'Assign an employee before starting work.');
    assert(nextStatus !== 'DONE' || !blocked, 422, 'A completed task cannot have unresolved blockers.');
    if (previous?.status === 'DONE') {
      assert(nextStatus !== 'DONE' || Object.keys(changes).every(k => k === 'status'), 422, 'Reopen a completed task before editing its details.');
      if (nextStatus !== 'DONE') {
        assert(!all.some(t => t.status === 'DONE' && t.dependencies.some(d => same(d, newId))), 409, 'Reopen dependent completed work first.');
        changes.completedAt = null;
        changes.completedBy = null;
        changes.completedAssigneeId = null;
        changes.reopenedCount = (previous.reopenedCount || 0) + 1;
        changes.remainingHours = changes.remainingHours ?? previous.estimatedHours;
      }
    }
    if (nextStatus === 'DONE' && previous?.status !== 'DONE') {
      changes.completedAt = new Date();
      changes.completedBy = ctx.employeeId;
      changes.completedAssigneeId = next.assigneeId;
      changes.remainingHours = 0;
    }
    const task = recordId ? await repo.patch(recordId, revision, changes) : await repo.create({
      ...changes,
      _id: newId,
      createdBy: ctx.userId,
      status: 'BACKLOG',
      remainingHours: changes.remainingHours ?? changes.estimatedHours
    });
    await activity(ctx, `Task ${recordId ? 'updated' : 'created'}`, 'Task', task, session);
    const recipients = unique([task.assigneeId, previous?.assigneeId, project.managerId]);
    await notify(ctx, recipients, {
      title: previous && !same(previous.assigneeId, task.assigneeId) ? 'Task reassigned' : 'Task updated',
      message: `${task.title} · ${task.status.replaceAll('_', ' ')}`,
      path: `/app/tasks?task=${id(task)}`,
      eventKey: `task:${id(task)}:${task.revision}`
    }, session);
    return task;
  });
}

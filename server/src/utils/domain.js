import { assert } from './errors.js';
export const ROLES = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'];
export const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const id = value => value?._id?.toString() ?? value?.toString() ?? '';
export const same = (a, b) => id(a) === id(b);
export const unique = values => [...new Set(values.map(id).filter(Boolean))];
export const utcDay = value => new Date(new Date(value).toISOString().slice(0, 10) + 'T00:00:00.000Z');
export const dayEnd = value => new Date(utcDay(value).getTime() + 86400000 - 1);
export const overlap = (a, b, c, d) => new Date(a) <= dayEnd(d) && dayEnd(b) >= new Date(c);
export const overdue = (task, now = new Date()) => task.status !== 'DONE' && dayEnd(task.dueDate) < now;
export function workdays(start, end, workingDays = [1, 2, 3, 4, 5]) {
  const cursor = utcDay(start),
    last = utcDay(end);
  let count = 0;
  assert(last >= cursor && last - cursor <= 366 * 86400000, 422, 'Choose a valid date range of at most one year.');
  while (cursor <= last) {
    if (workingDays.includes(cursor.getUTCDay())) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
const transitions = {
  BACKLOG: ['TODO'],
  TODO: ['BACKLOG', 'IN_PROGRESS'],
  IN_PROGRESS: ['TODO', 'REVIEW'],
  REVIEW: ['IN_PROGRESS', 'DONE'],
  DONE: ['IN_PROGRESS']
};
export function validateTransition(previous, next, {
  canReview = false,
  blocked = false
} = {}) {
  if (previous === next) return;
  assert(transitions[previous]?.includes(next), 422, `Move ${previous.replaceAll('_', ' ')} through the next workflow stage.`, 'INVALID_TRANSITION');
  assert(!(next === 'DONE' || previous === 'DONE') || canReview, 403, 'A project manager or authorized team leader must review or reopen completed work.');
  assert(!blocked || !['REVIEW', 'DONE'].includes(next), 422, 'Resolve blockers and dependencies before submitting or completing this task.');
}
export function assertAcyclic(tasks, taskId, dependencies) {
  const graph = new Map(tasks.map(t => [id(t), (t.dependencies || []).map(id)]));
  graph.set(id(taskId), dependencies.map(id));
  const visiting = new Set(),
    visited = new Set();
  function visit(node) {
    assert(!visiting.has(node), 422, 'This dependency would create a cycle.', 'DEPENDENCY_CYCLE');
    if (visited.has(node)) return;
    visiting.add(node);
    for (const next of graph.get(node) || []) visit(next);
    visiting.delete(node);
    visited.add(node);
  }
  visit(id(taskId));
}
export function projectVisible(ctx, project) {
  return ctx.role === 'ORGANIZATION_ADMIN' || same(project.managerId, ctx.employeeId) || project.memberIds?.some(x => same(x, ctx.employeeId)) || project.teamIds?.some(x => ctx.teamIds.includes(id(x)));
}
export function projectManageable(ctx, project) {
  return ctx.role === 'ORGANIZATION_ADMIN' || ctx.role === 'PROJECT_MANAGER' && same(project.managerId, ctx.employeeId);
}
export function taskManageable(ctx, project, task) {
  return projectManageable(ctx, project) || ctx.role === 'TEAM_LEADER' && projectVisible(ctx, project) && ctx.ledTeamIds.includes(id(task.teamId));
}
export function taskVisible(ctx, project, task) {
  return same(task.assigneeId, ctx.employeeId) || taskManageable(ctx, project, task);
}
export function mayApproveLeave(ctx, requester, organization) {
  if (same(requester, ctx.employeeId) || ctx.role === 'SUPER_ADMIN') return false;
  if (requester.role === 'ORGANIZATION_ADMIN') return same(organization.leaveDelegateId, ctx.employeeId);
  if (ctx.role === 'ORGANIZATION_ADMIN') return true;
  if (!same(requester.reportsToId, ctx.employeeId)) return false;
  return ctx.role === 'PROJECT_MANAGER' && ['EMPLOYEE', 'TEAM_LEADER'].includes(requester.role) || ctx.role === 'TEAM_LEADER' && requester.role === 'EMPLOYEE';
}

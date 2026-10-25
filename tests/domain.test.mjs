import test from 'node:test';
import assert from 'node:assert/strict';
import { workdays, overdue, validateTransition, assertAcyclic, projectVisible, projectManageable, taskVisible, taskManageable, mayApproveLeave, overlap } from '../server/src/utils/domain.js';
const project = {
  _id: 'p1',
  managerId: 'manager',
  teamIds: ['team'],
  memberIds: ['member']
};
const context = (role, employeeId = 'member') => ({
  role,
  employeeId,
  teamIds: ['team'],
  ledTeamIds: role === 'TEAM_LEADER' ? ['team'] : []
});
test('working days exclude weekends and count dates inclusively', () => assert.equal(workdays('2026-09-14', '2026-09-20'), 5));
test('custom workweek is respected', () => assert.equal(workdays('2026-09-14', '2026-09-20', [0, 1, 2, 3, 4, 5]), 6));
test('invalid reversed leave dates fail', () => assert.throws(() => workdays('2026-09-20', '2026-09-14')));
test('overdue begins after the whole UTC due date', () => assert.equal(overdue({
  status: 'TODO',
  dueDate: '2026-09-15'
}, new Date('2026-09-15T23:59:59Z')), false));
test('completed late work is not currently overdue', () => assert.equal(overdue({
  status: 'DONE',
  dueDate: '2026-09-10'
}, new Date('2026-09-15')), false));
test('overdue is independent of workflow status', () => assert.equal(overdue({
  status: 'REVIEW',
  dueDate: '2026-09-10'
}, new Date('2026-09-15')), true));
test('employee may submit in-progress work for review', () => assert.doesNotThrow(() => validateTransition('IN_PROGRESS', 'REVIEW')));
test('employee may not approve completion', () => assert.throws(() => validateTransition('REVIEW', 'DONE'), {
  status: 403
}));
test('manager may approve completion', () => assert.doesNotThrow(() => validateTransition('REVIEW', 'DONE', {
  canReview: true
})));
test('skipping workflow stages is rejected', () => assert.throws(() => validateTransition('TODO', 'DONE', {
  canReview: true
})));
test('blocked work cannot be submitted for review', () => assert.throws(() => validateTransition('IN_PROGRESS', 'REVIEW', {
  blocked: true
})));
test('reopening completed work needs review authority', () => assert.throws(() => validateTransition('DONE', 'IN_PROGRESS')));
test('dependency cycles fail including self-dependency', () => {
  assert.throws(() => assertAcyclic([{
    _id: 'b',
    dependencies: ['a']
  }], 'a', ['b']));
  assert.throws(() => assertAcyclic([], 'a', ['a']));
});
test('acyclic shared dependency is valid', () => assert.doesNotThrow(() => assertAcyclic([{
  _id: 'b',
  dependencies: ['c']
}, {
  _id: 'c',
  dependencies: []
}], 'a', ['b', 'c'])));
test('project membership grants viewing but not management', () => {
  assert.equal(projectVisible(context('EMPLOYEE'), project), true);
  assert.equal(projectManageable(context('EMPLOYEE'), project), false);
});
test('unrelated manager cannot manage project', () => assert.equal(projectManageable(context('PROJECT_MANAGER', 'different'), project), false));
test('assigned manager can manage project', () => assert.equal(projectManageable(context('PROJECT_MANAGER', 'manager'), project), true));
test('team leader can manage only led-team work', () => {
  assert.equal(taskManageable(context('TEAM_LEADER'), project, {
    teamId: 'team'
  }), true);
  assert.equal(taskManageable(context('TEAM_LEADER'), project, {
    teamId: 'other'
  }), false);
});
test('employee cannot view another employee task', () => assert.equal(taskVisible(context('EMPLOYEE'), project, {
  assigneeId: 'other'
}), false));
test('employee can view own task', () => assert.equal(taskVisible(context('EMPLOYEE'), project, {
  assigneeId: 'member'
}), true));
test('no role can approve its own leave', () => assert.equal(mayApproveLeave(context('ORGANIZATION_ADMIN'), {
  _id: 'member',
  role: 'ORGANIZATION_ADMIN'
}, {}), false));
test('platform admin is not a leave approver', () => assert.equal(mayApproveLeave(context('SUPER_ADMIN'), {
  _id: 'worker',
  role: 'EMPLOYEE',
  reportsToId: 'member'
}, {}), false));
test('direct team leader may approve employee leave', () => assert.equal(mayApproveLeave(context('TEAM_LEADER', 'lead'), {
  _id: 'worker',
  role: 'EMPLOYEE',
  reportsToId: 'lead'
}, {}), true));
test('unrelated manager cannot approve leave', () => assert.equal(mayApproveLeave(context('PROJECT_MANAGER', 'pm'), {
  _id: 'worker',
  role: 'EMPLOYEE',
  reportsToId: 'someone'
}, {}), false));
test('explicit delegate may approve administrator leave', () => assert.equal(mayApproveLeave(context('PROJECT_MANAGER', 'pm'), {
  _id: 'admin',
  role: 'ORGANIZATION_ADMIN'
}, {
  leaveDelegateId: 'pm'
}), true));
test('leave and deadline overlap includes boundary days', () => assert.equal(overlap('2026-09-10', '2026-09-12', '2026-09-12', '2026-09-14'), true));

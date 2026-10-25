import test from 'node:test';
import assert from 'node:assert/strict';
import { workloadFor, assignmentCandidates, healthFor, performanceFor, leaveImpactFor } from '../server/src/intelligence/rules.js';
const now = new Date('2026-09-14T10:00:00Z'),
  settings = {
    workingDays: [1, 2, 3, 4, 5],
    hoursPerDay: 8
  },
  employee = {
    _id: 'e',
    name: 'Engineer',
    status: 'ACTIVE',
    hoursPerWeek: 40,
    teamId: 't',
    skills: ['React'],
    experienceYears: 5
  };
const project = {
  _id: 'p',
  name: 'Example',
  managerId: 'pm',
  teamIds: ['t'],
  memberIds: ['e'],
  requiredSkills: ['React'],
  dueDate: '2026-09-28'
};
const task = {
  _id: 'task',
  assigneeId: 'e',
  projectId: 'p',
  teamId: 't',
  status: 'IN_PROGRESS',
  startDate: '2026-09-14',
  dueDate: '2026-09-25',
  remainingHours: 40,
  estimatedHours: 40,
  complexity: 1,
  requiredSkills: ['React'],
  dependencies: [],
  priority: 'MEDIUM'
};
test('14-day horizon has 80 hours at a 40-hour workweek', () => assert.equal(workloadFor(employee, [], [], settings, now).capacityHours, 80));
test('approved leave subtracts working days from capacity', () => assert.equal(workloadFor(employee, [], [{
  employeeId: 'e',
  status: 'APPROVED',
  startDate: '2026-09-14',
  endDate: '2026-09-18'
}], settings, now).capacityHours, 40));
test('pending leave does not reduce capacity', () => assert.equal(workloadFor(employee, [], [{
  employeeId: 'e',
  status: 'PENDING',
  startDate: '2026-09-14',
  endDate: '2026-09-18'
}], settings, now).capacityHours, 80));
test('overlapping absence records cannot double-subtract capacity', () => {
  const leave = {
    employeeId: 'e',
    status: 'APPROVED',
    startDate: '2026-09-14',
    endDate: '2026-09-18'
  };
  assert.equal(workloadFor(employee, [], [leave, leave], settings, now).capacityHours, 40);
});
test('work is allocated proportionally by its planning window', () => assert.equal(workloadFor(employee, [{
  ...task,
  dueDate: '2026-10-09'
}], [], settings, now).committedHours, 20));
test('overdue remaining work counts in the current horizon', () => assert.equal(workloadFor(employee, [{
  ...task,
  dueDate: '2026-09-10'
}], [], settings, now).committedHours, 40));
test('future work outside horizon is not counted early', () => assert.equal(workloadFor(employee, [{
  ...task,
  startDate: '2026-10-01',
  dueDate: '2026-10-05'
}], [], settings, now).committedHours, 0));
test('completed work does not consume remaining capacity', () => assert.equal(workloadFor(employee, [{
  ...task,
  status: 'DONE'
}], [], settings, now).committedHours, 0));
test('zero capacity yields finite values and an unavailable flag', () => {
  const leave = {
    employeeId: 'e',
    status: 'APPROVED',
    startDate: '2026-09-14',
    endDate: '2026-09-27'
  };
  const result = workloadFor(employee, [task], [leave], settings, now);
  assert.equal(result.unavailable, true);
  assert.equal(Number.isFinite(result.usage), true);
  assert.equal(result.overloaded, true);
});
test('assignment excludes disabled and wrong-team candidates', () => {
  const loads = [workloadFor(employee, [], [], settings, now)];
  const result = assignmentCandidates({
    task,
    project,
    employees: [employee, {
      ...employee,
      _id: 'x',
      status: 'DISABLED'
    }, {
      ...employee,
      _id: 'z',
      teamId: 'other'
    }],
    loads,
    leaves: [],
    now
  });
  assert.deepEqual(result.map(x => x.employeeId), ['e']);
});
test('assignment score is reproducible and factor sum matches', () => {
  const input = {
    task,
    project,
    employees: [employee],
    loads: [workloadFor(employee, [], [], settings, now)],
    leaves: [],
    now
  };
  const result = assignmentCandidates(input)[0];
  assert.equal(result.score, Object.values(result.factors).reduce((a, b) => a + b, 0));
  assert.deepEqual(assignmentCandidates(input), assignmentCandidates(input));
});
test('approved-leave conflict makes a recommendation ineligible', () => {
  const leaves = [{
    employeeId: 'e',
    status: 'APPROVED',
    startDate: '2026-09-16',
    endDate: '2026-09-18'
  }];
  const result = assignmentCandidates({
    task,
    project,
    employees: [employee],
    loads: [workloadFor(employee, [], leaves, settings, now)],
    leaves,
    now
  })[0];
  assert.equal(result.eligible, false);
  assert.equal(result.factors.availability, 0);
});
test('project without tasks does not receive a fabricated score', () => {
  const r = healthFor(project, [], [], [], now);
  assert.equal(r.score, null);
  assert.equal(r.level, 'NOT_ENOUGH_DATA');
});
test('overdue blocked critical work lowers health with explanations', () => {
  const r = healthFor(project, [{
    ...task,
    dueDate: '2026-09-01',
    priority: 'CRITICAL',
    blockedReason: 'Waiting'
  }], [], [], now);
  assert.ok(r.score < 80);
  assert.ok(r.reasons.some(x => x.includes('overdue')));
  assert.equal(r.blocked, 1);
});
test('completed work is excluded from current risk penalties', () => {
  const r = healthFor(project, [{
    ...task,
    status: 'DONE',
    dueDate: '2026-09-01'
  }], [], [], now);
  assert.equal(r.overdue, 0);
  assert.equal(r.score, 100);
});
test('performance refuses recognition from fewer than three completions', () => assert.equal(performanceFor(employee, [{
  ...task,
  status: 'DONE',
  completedAt: '2026-09-15'
}], [], settings, now).score, null));
test('approved leave never subtracts score and adjusts timeliness', () => {
  const tasks = [1, 2, 3].map(n => ({
    ...task,
    _id: String(n),
    status: 'DONE',
    completedAssigneeId: 'e',
    startDate: '2026-09-01',
    dueDate: '2026-09-15',
    completedAt: '2026-09-17'
  }));
  const leave = {
    employeeId: 'e',
    status: 'APPROVED',
    startDate: '2026-09-14',
    endDate: '2026-09-15'
  };
  const withLeave = performanceFor(employee, tasks, [leave], settings, now),
    without = performanceFor(employee, tasks, [], settings, now);
  assert.equal(withLeave.score, 100);
  assert.ok(withLeave.score >= without.score);
});
test('reopening is identified as a delivery proxy, weighted by effort', () => {
  const tasks = [1, 2, 3].map(n => ({
    ...task,
    _id: String(n),
    status: 'DONE',
    completedAt: '2026-09-15',
    reopenedCount: n === 3 ? 1 : 0
  }));
  const r = performanceFor(employee, tasks, [], settings, now);
  assert.ok(r.score < 100);
  assert.ok(r.firstPassRate < 100);
});
test('leave impact finds critical overlapping tasks without deciding leave', () => {
  const r = leaveImpactFor({
    employeeId: 'e',
    startDate: '2026-09-20',
    endDate: '2026-09-25'
  }, [{
    ...task,
    priority: 'CRITICAL'
  }], [project], now);
  assert.equal(r.level, 'HIGH');
  assert.equal(r.affected.length, 1);
  assert.equal(r.deadlineConflicts, 1);
  assert.equal('status' in r, false);
});
test('leave impact excludes unrelated and completed work', () => {
  const r = leaveImpactFor({
    employeeId: 'e',
    startDate: '2026-09-20',
    endDate: '2026-09-25'
  }, [{
    ...task,
    assigneeId: 'another'
  }, {
    ...task,
    status: 'DONE'
  }], [project], now);
  assert.equal(r.affected.length, 0);
});

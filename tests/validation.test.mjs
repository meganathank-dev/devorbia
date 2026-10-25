import test from 'node:test';
import assert from 'node:assert/strict';
import { employeeSchema, taskSchema, projectSchema, listSchema, loginSchema, leaveSchema, activateSchema, objectId } from '../server/src/validators/index.js';
const id = '0123456789abcdef01234567';
const employee = {
  name: 'An Example',
  email: 'person@example.test',
  role: 'EMPLOYEE',
  joiningDate: '2026-09-15'
};
test('strict inputs reject a client-supplied organization', () => assert.throws(() => employeeSchema.parse({
  ...employee,
  organizationId: id
})));
test('employee invitations cannot create another administrator', () => assert.throws(() => employeeSchema.parse({
  ...employee,
  role: 'ORGANIZATION_ADMIN'
})));
test('malformed IDs are rejected before a database query', () => assert.throws(() => objectId.parse('not-an-id')));
test('query limits reject unbounded requests', () => assert.throws(() => listSchema.parse({
  limit: 100000
})));
test('pagination rejects negative pages', () => assert.throws(() => listSchema.parse({
  page: -1
})));
test('query parsing rejects object injection', () => assert.throws(() => listSchema.parse({
  status: {
    $ne: 'DONE'
  }
})));
test('calendar dates must be real dates', () => assert.throws(() => leaveSchema.parse({
  type: 'PAID',
  startDate: '2026-02-30',
  endDate: '2026-03-01',
  reason: 'Personal time'
})));
test('password activation requires a strong minimum length', () => assert.throws(() => activateSchema.parse({
  token: 'x'.repeat(43),
  password: 'short'
})));
test('login normalizes email case and whitespace', () => assert.equal(loginSchema.parse({
  email: '  Name@Example.Test ',
  password: 'example'
}).email, 'name@example.test'));
test('project membership rejects duplicate references', () => assert.throws(() => projectSchema.parse({
  name: 'Project',
  code: 'PRJ',
  managerId: id,
  teamIds: [id, id],
  startDate: '2026-09-01',
  dueDate: '2026-09-30'
})));
test('tasks cannot begin directly in done through creation input', () => assert.throws(() => taskSchema.parse({
  projectId: id,
  title: 'Task title',
  status: 'DONE',
  startDate: '2026-09-01',
  dueDate: '2026-09-30'
})));
test('task effort must be bounded and nonnegative', () => assert.throws(() => taskSchema.parse({
  projectId: id,
  title: 'Task title',
  startDate: '2026-09-01',
  dueDate: '2026-09-30',
  remainingHours: -1
})));

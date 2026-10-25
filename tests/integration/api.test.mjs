import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import supertest from 'supertest';
dotenv.config({
  quiet: true
});
const testUri = process.env.TEST_MONGODB_URI;
if (!testUri) throw new Error('Set TEST_MONGODB_URI to a local or test MongoDB replica set before running integration tests. Each run creates and removes a new devorbia_test_* database.');
const uri = new URL(testUri);
uri.pathname = `/devorbia_test_${randomBytes(8).toString('hex')}`;
process.env.MONGODB_URI = uri.href;
process.env.NODE_ENV = 'test';
process.env.APP_SECRET = randomBytes(48).toString('hex');
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MAIL_TRANSPORT = 'file';
process.env.JOBS_ENABLED = 'false';
const [{
  default: mongoose
}, {
  connectDatabase,
  transaction
}, {
  createApp
}, {
  createFixtures
}, models, {
  decrypt
}] = await Promise.all([import('mongoose'), import('../../server/src/config/database.js'), import('../../server/src/app.js'), import('../../server/scripts/fixtures.js'), import('../../server/src/models/index.js'), import('../../server/src/utils/security.js')]);
const password = 'A unique integration test passphrase 47!',
  actors = {};
let app, fixture, A, B;
const path = url => `/api/v1${url}`;
async function signIn(email) {
  const agent = supertest.agent(app);
  const response = await agent.post(path('/auth/login')).set('X-Requested-With', 'DevOrbia').send({
    email,
    password
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return {
    agent,
    csrf: response.body.data.csrf
  };
}
async function request(actor, method, url, body) {
  const req = actor.agent[method](path(url));
  if (!['get', 'head'].includes(method)) req.set('X-Requested-With', 'DevOrbia').set('X-CSRF-Token', actor.csrf);
  return body === undefined ? req : req.send(body);
}
async function taskRecord(taskId) {
  const response = await request(actors.admin, 'get', `/tasks/${taskId}`);
  assert.equal(response.status, 200);
  return response.body.data;
}
const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
async function createTask(extra = {}) {
  const response = await request(actors.admin, 'post', '/tasks', {
    projectId: String(A.projects[0]._id),
    title: 'Integration task',
    assigneeId: String(A.employees.employee._id),
    teamId: String(A.teams[0]._id),
    startDate: day(0),
    dueDate: day(2),
    estimatedHours: 2,
    remainingHours: 2,
    ...extra
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body.data;
}
before(async () => {
  await connectDatabase();
  fixture = await transaction(session => createFixtures({
    password,
    session
  }));
  [A, B] = fixture.organizations;
  app = createApp();
  for (const [key, email] of Object.entries({
    platform: fixture.platform.email,
    admin: A.users.admin.email,
    pm: A.users.pm.email,
    lead: A.users.lead.email,
    employee: A.users.employee.email,
    otherPm: A.users.pm2.email,
    otherAdmin: B.users.admin.email
  })) actors[key] = await signIn(email);
});
after(async () => {
  if (mongoose.connection.name?.startsWith('devorbia_test_')) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
test('health API reflects a live database', async () => assert.equal((await supertest(app).get(path('/health'))).status, 200));
test('anonymous API access is denied', async () => assert.equal((await supertest(app).get(path('/projects'))).status, 401));
test('public registration does not exist', async () => assert.notEqual((await supertest(app).post(path('/auth/register')).set('X-Requested-With', 'DevOrbia').send({})).status, 201));
test('cookies are HTTP-only for access and refresh', async () => {
  const result = await supertest(app).post(path('/auth/login')).set('X-Requested-With', 'DevOrbia').send({
    email: A.users.dev.email,
    password
  });
  const cookies = result.headers['set-cookie'];
  assert.ok(cookies.find(x => x.startsWith('do_access=')).includes('HttpOnly'));
  assert.ok(cookies.find(x => x.startsWith('do_refresh=')).includes('HttpOnly'));
});
test('invalid login is denied without returning hashes', async () => {
  const result = await supertest(app).post(path('/auth/login')).set('X-Requested-With', 'DevOrbia').send({
    email: A.users.admin.email,
    password: 'incorrect'
  });
  assert.equal(result.status, 401);
  assert.ok(!JSON.stringify(result.body).includes('passwordHash'));
});
test('mutations reject a missing CSRF token', async () => {
  const result = await actors.admin.agent.patch(path(`/employees/${A.employees.dev._id}`)).set('X-Requested-With', 'DevOrbia').send({
    revision: 0,
    name: 'Changed'
  });
  assert.equal(result.status, 403);
});
test('untrusted browser origins are rejected', async () => {
  const result = await actors.admin.agent.post(path('/notifications/read-all')).set('X-Requested-With', 'DevOrbia').set('X-CSRF-Token', actors.admin.csrf).set('Origin', 'https://untrusted.example').send({});
  assert.equal(result.status, 403);
});
for (const [resource, record] of [['projects', () => B.projects[0]], ['tasks', () => B.tasks[0]], ['employees', () => B.employees.employee], ['teams', () => B.teams[0]], ['departments', () => B.departments[0]]]) test(`cross-tenant ${resource} detail is hidden`, async () => assert.equal((await request(actors.admin, 'get', `/${resource}/${record()._id}`)).status, 404));
test('cross-tenant project edits fail', async () => assert.equal((await request(actors.admin, 'patch', `/projects/${B.projects[0]._id}`, {
  revision: 0,
  name: 'Forbidden'
})).status, 404));
test('cross-tenant assignment references fail', async () => {
  const task = await createTask();
  const result = await request(actors.admin, 'patch', `/tasks/${task._id}`, {
    revision: task.revision,
    assigneeId: String(B.employees.employee._id)
  });
  assert.equal(result.status, 404);
});
test('list filters cannot escape the organization', async () => {
  const response = await request(actors.admin, 'get', `/tasks?projectId=${B.projects[0]._id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.total, 0);
});
test('employees cannot create platform organizations', async () => assert.equal((await request(actors.employee, 'post', '/organizations', {})).status, 403));
test('platform administrator cannot access organization tasks', async () => assert.equal((await request(actors.platform, 'get', '/tasks')).status, 403));
test('employee cannot read a colleague task', async () => {
  const other = A.tasks.find(t => String(t.assigneeId) !== String(A.employees.employee._id));
  assert.equal((await request(actors.employee, 'get', `/tasks/${other._id}`)).status, 404);
});
test('unrelated same-tenant manager cannot view a project', async () => assert.equal((await request(actors.otherPm, 'get', `/projects/${A.projects[0]._id}`)).status, 404));
test('employee cannot modify management-only fields', async () => {
  const task = await createTask();
  assert.equal((await request(actors.employee, 'patch', `/tasks/${task._id}`, {
    revision: task.revision,
    priority: 'CRITICAL'
  })).status, 403);
});
test('workflow requires the authorized review gate', async () => {
  let task = await createTask();
  for (const status of ['TODO', 'IN_PROGRESS', 'REVIEW']) {
    const result = await request(actors.employee, 'patch', `/tasks/${task._id}`, {
      revision: task.revision,
      status
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    task = result.body.data;
  }
  assert.equal((await request(actors.employee, 'patch', `/tasks/${task._id}`, {
    revision: task.revision,
    status: 'DONE'
  })).status, 403);
  const done = await request(actors.pm, 'patch', `/tasks/${task._id}`, {
    revision: task.revision,
    status: 'DONE'
  });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.equal(done.body.data.remainingHours, 0);
  assert.ok(done.body.data.completedAt);
});
test('skipping workflow stages is rejected', async () => {
  const task = await createTask();
  assert.equal((await request(actors.admin, 'patch', `/tasks/${task._id}`, {
    revision: task.revision,
    status: 'DONE'
  })).status, 422);
});
test('dependency cycles are rejected transactionally', async () => {
  const first = await createTask(),
    second = await createTask({
      dependencies: [first._id]
    });
  const result = await request(actors.admin, 'patch', `/tasks/${first._id}`, {
    revision: first.revision,
    dependencies: [second._id]
  });
  assert.equal(result.status, 422);
  assert.equal((await taskRecord(first._id)).dependencies.length, 0);
});
test('only one concurrent revision update succeeds', async () => {
  const task = await createTask();
  const results = await Promise.all(['First edit', 'Second edit'].map(blockedReason => request(actors.admin, 'patch', `/tasks/${task._id}`, {
    revision: task.revision,
    blockedReason
  })));
  assert.deepEqual(results.map(x => x.status).sort(), [200, 409]);
});
test('project completion is blocked while work is unfinished', async () => {
  const current = (await request(actors.admin, 'get', `/projects/${A.projects[0]._id}`)).body.data;
  assert.equal((await request(actors.admin, 'patch', `/projects/${current._id}`, {
    revision: current.revision,
    status: 'COMPLETED'
  })).status, 422);
});
test('employee deactivation is blocked by outstanding work', async () => {
  const current = (await request(actors.admin, 'get', `/employees/${A.employees.employee._id}`)).body.data;
  assert.equal((await request(actors.admin, 'patch', `/employees/${current._id}`, {
    revision: current.revision,
    status: 'DISABLED'
  })).status, 409);
});
test('departments with active dependencies cannot be archived', async () => {
  const d = A.departments[0];
  assert.equal((await request(actors.admin, 'patch', `/departments/${d._id}`, {
    revision: 0,
    archived: true
  })).status, 409);
});
test('leave cannot be self-approved', async () => {
  const pending = A.leaves[1],
    actor = await signIn(A.users.design.email);
  assert.equal((await request(actor, 'patch', `/leave/${pending._id}`, {
    revision: 0,
    status: 'APPROVED',
    decisionNote: ''
  })).status, 403);
});
test('reporting leader can approve leave with project impact', async () => {
  const pending = A.leaves[1];
  const result = await request(actors.lead, 'patch', `/leave/${pending._id}`, {
    revision: 0,
    status: 'APPROVED',
    decisionNote: 'Arrange coverage.'
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
});
test('cross-tenant leave analysis is hidden', async () => assert.equal((await request(actors.admin, 'get', `/ai/leave/${B.leaves[0]._id}/impact`)).status, 404));
test('assignment recommendations contain only same-tenant members', async () => {
  const task = await createTask();
  const response = await request(actors.pm, 'get', `/ai/tasks/${task._id}/assignment`);
  assert.equal(response.status, 200);
  const allowed = new Set(Object.values(A.employees).map(e => String(e._id)));
  assert.ok(response.body.data.candidates.every(c => allowed.has(c.employeeId)));
});
test('employees cannot obtain management assignment recommendations', async () => assert.equal((await request(actors.employee, 'get', `/ai/tasks/${A.tasks[0]._id}/assignment`)).status, 404));
test('cross-tenant AI project resources are hidden', async () => assert.equal((await request(actors.admin, 'get', `/ai/projects/${B.projects[0]._id}/resources`)).status, 404));
test('analytics are computed inside tenant scope', async () => {
  const response = await request(actors.admin, 'get', '/analytics');
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const forbidden = String(B.projects[0]._id);
  assert.ok(!JSON.stringify(response.body).includes(forbidden));
});
test('notification IDs are private to their recipient', async () => {
  const note = await models.Notification.findOne({
    userId: A.users.pm._id
  }).lean();
  assert.equal((await request(actors.employee, 'patch', `/notifications/${note._id}/read`, {})).status, 404);
});
test('invitation activation is single-use and has no public signup', async () => {
  const response = await request(actors.platform, 'post', '/organizations', {
    name: 'Integration Organization',
    slug: 'integration-organization',
    email: 'office@integration.example.test',
    adminName: 'New Administrator',
    adminEmail: 'new-admin@integration.example.test'
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const mail = await models.Mail.findOne({
    to: 'new-admin@integration.example.test'
  }).lean();
  const token = decrypt(mail.encryptedBody, process.env.APP_SECRET).match(/#token=([^\s]+)/)[1];
  const activate = () => supertest(app).post(path('/auth/accept-invitation')).set('X-Requested-With', 'DevOrbia').send({
    token,
    password
  });
  assert.equal((await activate()).status, 200);
  assert.equal((await activate()).status, 400);
});
test('password recovery invalidates previous sessions', async () => {
  const actor = await signIn(A.users.dev.email);
  await request(actor, 'post', '/auth/forgot-password', {
    email: A.users.dev.email
  });
  const mail = await models.Mail.findOne({
    to: A.users.dev.email,
    subject: 'Reset your DevOrbia password'
  }).sort({
    createdAt: -1
  }).lean();
  const token = decrypt(mail.encryptedBody, process.env.APP_SECRET).match(/#token=([^\s]+)/)[1];
  const response = await supertest(app).post(path('/auth/reset-password')).set('X-Requested-With', 'DevOrbia').send({
    token,
    password: 'A replacement integration passphrase 71!'
  });
  assert.equal(response.status, 200);
  assert.equal((await request(actor, 'get', '/auth/me')).status, 401);
});
test('refresh rotates credentials and invalidates the old refresh token', async () => {
  const agent = supertest.agent(app),
    login = await agent.post(path('/auth/login')).set('X-Requested-With', 'DevOrbia').send({
      email: A.users.qa.email,
      password
    });
  assert.equal(login.status, 200);
  const old = login.headers['set-cookie'].find(c => c.startsWith('do_refresh=')).split(';')[0];
  const response = await agent.post(path('/auth/refresh')).set('X-Requested-With', 'DevOrbia').send({});
  assert.equal(response.status, 200);
  const replay = await supertest(app).post(path('/auth/refresh')).set('Cookie', old).set('X-Requested-With', 'DevOrbia').send({});
  assert.equal(replay.status, 401);
});
test('organization deactivation revokes all organization access', async () => {
  const response = await request(actors.platform, 'patch', `/organizations/${B.organization._id}`, {
    revision: 0,
    active: false
  });
  assert.equal(response.status, 200);
  const denied = await request(actors.otherAdmin, 'get', '/projects');
  assert.ok([401, 403].includes(denied.status));
});

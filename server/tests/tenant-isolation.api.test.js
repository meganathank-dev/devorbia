const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Organization = require('../src/models/organization.model');
const Membership = require('../src/models/membership.model');
const { connectDB, disconnectDB, clearDB } = require('./utils/test-db.setup');
const { ORG_ROLES } = require('../src/utils/constants');
const { hashPassword } = require('../src/utils/password.util');

describe('Tenant Isolation Verification', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterEach(async () => {
    await clearDB();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  const getCookie = (res, name) => {
    const cookies = res.headers['set-cookie'];
    if (!cookies) return null;
    const cookie = cookies.find(c => c.startsWith(`${name}=`));
    if (!cookie) return null;
    return cookie.split(';')[0].split('=')[1];
  };

  it('User in Organization A CANNOT access Organization B endpoints', async () => {
    const passwordHash = await hashPassword('password123');

    // Create User A and Org A
    const userA = await User.create({ email: 'usera@test.com', passwordHash });
    const orgA = await Organization.create({ name: 'Org A', slug: 'org-a', createdBy: userA._id });
    await Membership.create({ userId: userA._id, organizationId: orgA._id, role: ORG_ROLES.OWNER });

    // Create User B and Org B
    const userB = await User.create({ email: 'userb@test.com', passwordHash });
    const orgB = await Organization.create({ name: 'Org B', slug: 'org-b', createdBy: userB._id });
    await Membership.create({ userId: userB._id, organizationId: orgB._id, role: ORG_ROLES.OWNER });

    // User A logs in
    const loginResA = await request(app).post('/api/v1/auth/login').send({ email: userA.email, password: 'password123' });
    const accessTokenA = getCookie(loginResA, 'accessToken');

    // User A attempts to invite someone to Org B
    const maliciousReq = await request(app)
      .post(`/api/v1/organizations/${orgB._id}/invitations`)
      .set('Cookie', [`accessToken=${accessTokenA}`])
      .send({
        email: 'hacked@test.com',
        role: ORG_ROLES.ADMIN
      });

    // Should be completely blocked
    expect(maliciousReq.status).toBe(403);
    expect(maliciousReq.body.error.message).toBe('You do not have access to this organization');
  });

  it('User belonging to both organizations has appropriate boundaries respected', async () => {
    const passwordHash = await hashPassword('password123');

    const userDual = await User.create({ email: 'dual@test.com', passwordHash });
    
    // Admin in Org 1
    const org1 = await Organization.create({ name: 'Org 1', slug: 'org-1', createdBy: userDual._id });
    await Membership.create({ userId: userDual._id, organizationId: org1._id, role: ORG_ROLES.ADMIN });

    // Employee in Org 2
    const org2 = await Organization.create({ name: 'Org 2', slug: 'org-2', createdBy: userDual._id });
    await Membership.create({ userId: userDual._id, organizationId: org2._id, role: ORG_ROLES.EMPLOYEE });

    // Dual User logs in
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: userDual.email, password: 'password123' });
    const accessToken = getCookie(loginRes, 'accessToken');

    // Dual user tries to invite in Org 1 (Allowed because ADMIN)
    const validReq = await request(app)
      .post(`/api/v1/organizations/${org1._id}/invitations`)
      .set('Cookie', [`accessToken=${accessToken}`])
      .send({ email: 'new1@test.com', role: ORG_ROLES.EMPLOYEE });
    
    expect(validReq.status).toBe(201);

    // Dual user tries to invite in Org 2 (Blocked because EMPLOYEE)
    const invalidReq = await request(app)
      .post(`/api/v1/organizations/${org2._id}/invitations`)
      .set('Cookie', [`accessToken=${accessToken}`])
      .send({ email: 'new2@test.com', role: ORG_ROLES.EMPLOYEE });
    
    expect(invalidReq.status).toBe(403);
    expect(invalidReq.body.error.message).toBe('Insufficient organization privileges');
  });
});

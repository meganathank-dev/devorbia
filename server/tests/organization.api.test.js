const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Organization = require('../src/models/organization.model');
const Membership = require('../src/models/membership.model');
const { connectDB, disconnectDB, clearDB } = require('./utils/test-db.setup');
const { ORG_ROLES } = require('../src/utils/constants');
const { hashPassword } = require('../src/utils/password.util');
const { generateAccessToken } = require('../src/utils/token.util');

describe('Organization & Bootstrap APIs', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterEach(async () => {
    await clearDB();
    jest.clearAllMocks();
    delete process.env.BOOTSTRAP_SECRET;
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

  describe('Bootstrap Architecture', () => {
    it('should NOT expose the HTTP bootstrap endpoint (returns 404)', async () => {
      // Create a dummy user to pass the requireAuth middleware and actually reach the router to get a 404
      const dummyUser = await User.create({
        email: 'dummy@test.com',
        passwordHash: 'dummy',
        status: 'ACTIVE'
      });
      const token = generateAccessToken({ id: dummyUser._id.toString() });
      
      const res = await request(app)
        .post('/api/v1/organizations/bootstrap')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          orgName: 'Acme Corp',
          orgSlug: 'acme',
          ownerEmail: 'owner@acme.com',
          ownerPassword: 'securepassword123'
        });

      expect(res.status).toBe(404);
    });

    it('should create the initial organization, owner user, and owner membership via the OrganizationService', async () => {
      const OrganizationService = require('../src/services/organization.service');
      const passwordHash = await hashPassword('securepassword123');

      const { user, organization } = await OrganizationService.bootstrap(
        'Acme Corp',
        'acme',
        'owner@acme.com',
        passwordHash
      );

      expect(organization.name).toBe('Acme Corp');
      expect(organization.slug).toBe('acme');
      expect(user.email).toBe('owner@acme.com');

      // Verify in DB
      const dbUser = await User.findOne({ email: 'owner@acme.com' });
      expect(dbUser).toBeTruthy();
      
      const dbOrg = await Organization.findOne({ slug: 'acme' });
      expect(dbOrg).toBeTruthy();
      expect(dbOrg.createdBy.toString()).toBe(dbUser._id.toString());

      const dbMembership = await Membership.findOne({ userId: dbUser._id, organizationId: dbOrg._id });
      expect(dbMembership).toBeTruthy();
      expect(dbMembership.role).toBe(ORG_ROLES.OWNER);
    });

    it('should refuse to run if the system is already bootstrapped (idempotency)', async () => {
      const OrganizationService = require('../src/services/organization.service');
      const passwordHash = await hashPassword('securepassword123');

      // First run should succeed
      await OrganizationService.bootstrap(
        'First Org',
        'first',
        'first@acme.com',
        passwordHash
      );

      // Second run should fail
      await expect(OrganizationService.bootstrap(
        'Second Org',
        'second',
        'second@acme.com',
        passwordHash
      )).rejects.toThrow('System already bootstrapped: organizations exist.');
    });
  });

  describe('GET /api/v1/organizations/my', () => {
    it('should return active organizations for authenticated user', async () => {
      // 1. Setup Data
      const passwordHash = await hashPassword('password123');
      const user = await User.create({ email: 'user@test.com', passwordHash });
      const org = await Organization.create({ name: 'Test Org', slug: 'test-org', createdBy: user._id });
      await Membership.create({ userId: user._id, organizationId: org._id, role: ORG_ROLES.EMPLOYEE });

      // 2. Login
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'password123' });
      const accessToken = getCookie(loginRes, 'accessToken');

      // 3. Test
      const res = await request(app)
        .get('/api/v1/organizations/my')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.organizations).toHaveLength(1);
      expect(res.body.data.organizations[0].name).toBe('Test Org');
      expect(res.body.data.organizations[0].role).toBe(ORG_ROLES.EMPLOYEE);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/organizations/my');
      expect(res.status).toBe(401);
    });
  });
});

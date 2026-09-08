const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Organization = require('../src/models/organization.model');
const Membership = require('../src/models/membership.model');
const Invitation = require('../src/models/invitation.model');
const { connectDB, disconnectDB, clearDB } = require('./utils/test-db.setup');
const { ORG_ROLES, INVITATION_STATUS } = require('../src/utils/constants');
const { hashPassword } = require('../src/utils/password.util');

describe('Invitation APIs & Onboarding Flow', () => {
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

  const setupData = async (role = ORG_ROLES.OWNER) => {
    const passwordHash = await hashPassword('password123');
    const user = await User.create({ email: 'inviter@test.com', passwordHash });
    const org = await Organization.create({ name: 'Inviter Org', slug: 'inviter-org', createdBy: user._id });
    await Membership.create({ userId: user._id, organizationId: org._id, role });
    
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'password123' });
    const accessToken = getCookie(loginRes, 'accessToken');
    
    return { user, org, accessToken };
  };

  describe('POST /api/v1/organizations/:orgId/invitations', () => {
    it('should allow OWNER to invite a user', async () => {
      const { org, accessToken } = await setupData(ORG_ROLES.OWNER);

      const res = await request(app)
        .post(`/api/v1/organizations/${org._id}/invitations`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          email: 'newbie@test.com',
          role: ORG_ROLES.EMPLOYEE
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('Invitation created successfully');
      expect(res.body.data.rawToken).toBeTruthy();
      expect(res.body.data.invitation.email).toBe('newbie@test.com');
    });

    it('should block EMPLOYEE from inviting a user', async () => {
      const { org, accessToken } = await setupData(ORG_ROLES.EMPLOYEE);

      const res = await request(app)
        .post(`/api/v1/organizations/${org._id}/invitations`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          email: 'newbie@test.com',
          role: ORG_ROLES.EMPLOYEE
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('Insufficient organization privileges');
    });

    it('should block users who are not in the organization', async () => {
      // Create a user in Org A
      const { user, accessToken } = await setupData(ORG_ROLES.OWNER);
      
      // Target Org B
      const orgB = await Organization.create({ name: 'Org B', slug: 'org-b', createdBy: user._id }); // user created it, but no membership yet

      const res = await request(app)
        .post(`/api/v1/organizations/${orgB._id}/invitations`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          email: 'newbie@test.com',
          role: ORG_ROLES.EMPLOYEE
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('You do not have access to this organization');
    });
  });

  describe('Invitation Acceptance Flow', () => {
    it('should successfully onboard a new user via token', async () => {
      const { org, accessToken } = await setupData(ORG_ROLES.OWNER);

      // 1. Create Invite
      const inviteRes = await request(app)
        .post(`/api/v1/organizations/${org._id}/invitations`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          email: 'newbie@test.com',
          role: ORG_ROLES.EMPLOYEE
        });

      const { rawToken, invitation } = inviteRes.body.data;

      // 2. Fetch Invite Details (Public)
      const getRes = await request(app).get(`/api/v1/invitations/${rawToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.invitation.email).toBe('newbie@test.com');
      expect(getRes.body.data.invitation.organizationName).toBe('Inviter Org');

      // 3. Accept Invite
      const acceptRes = await request(app)
        .post(`/api/v1/invitations/${rawToken}/accept`)
        .send({
          password: 'newbiepassword123'
        });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.message).toBe('Invitation accepted successfully');
      
      // 4. Verify DB State
      const dbInvite = await Invitation.findById(invitation.id);
      expect(dbInvite.status).toBe(INVITATION_STATUS.ACCEPTED);

      const dbUser = await User.findOne({ email: 'newbie@test.com' });
      expect(dbUser).toBeTruthy();

      const dbMembership = await Membership.findOne({ userId: dbUser._id, organizationId: org._id });
      expect(dbMembership).toBeTruthy();
      expect(dbMembership.role).toBe(ORG_ROLES.EMPLOYEE);
    });

    it('should prevent reusing an accepted invitation', async () => {
      const { org, accessToken } = await setupData(ORG_ROLES.OWNER);

      const inviteRes = await request(app)
        .post(`/api/v1/organizations/${org._id}/invitations`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          email: 'newbie2@test.com',
          role: ORG_ROLES.EMPLOYEE
        });

      const { rawToken } = inviteRes.body.data;

      await request(app).post(`/api/v1/invitations/${rawToken}/accept`).send({ password: 'password123' });

      // Try again
      const acceptRes2 = await request(app)
        .post(`/api/v1/invitations/${rawToken}/accept`)
        .send({ password: 'password123' });

      expect(acceptRes2.status).toBe(400);
      expect(acceptRes2.body.error.message).toBe('Invitation already accepted');
    });
  });
});

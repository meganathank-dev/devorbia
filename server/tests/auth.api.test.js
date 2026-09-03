const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Session = require('../src/models/session.model');
const { hashPassword } = require('../src/utils/password.util');
const { connectDB, disconnectDB, clearDB } = require('./utils/test-db.setup');
const { ACCOUNT_STATUS, ROLES } = require('../src/utils/constants');

// Parse cookies helper for supertest
const getCookie = (res, name) => {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return null;
  const cookie = cookies.find(c => c.startsWith(`${name}=`));
  if (!cookie) return null;
  return cookie.split(';')[0].split('=')[1];
};

describe('Authentication APIs', () => {
  beforeAll(async () => {
    await connectDB();
  }, 120000); // 2 minute timeout for initial download

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const password = 'securePassword123';
      const passwordHash = await hashPassword(password);
      
      const user = await User.create({
        email: 'test@example.com',
        passwordHash,
        role: ROLES.EMPLOYEE,
        status: ACCOUNT_STATUS.ACTIVE,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Never return password hash

      // Check cookies
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(setCookie.some(c => c.includes('accessToken='))).toBe(true);
      expect(setCookie.some(c => c.includes('refreshToken='))).toBe(true);
      expect(setCookie.some(c => c.includes('HttpOnly'))).toBe(true);

      // Verify session created in DB
      const sessions = await Session.find({ user: user._id });
      expect(sessions.length).toBe(1);

      // Verify lastLoginAt updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.lastLoginAt).toBeDefined();
    });

    it('should fail with generic error for unknown email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'password'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('should fail with generic error for incorrect password', async () => {
      const passwordHash = await hashPassword('correct');
      await User.create({
        email: 'test@example.com',
        passwordHash,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('should prevent inactive users from logging in', async () => {
      const password = 'password';
      const passwordHash = await hashPassword(password);
      await User.create({
        email: 'inactive@example.com',
        passwordHash,
        status: ACCOUNT_STATUS.INACTIVE
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@example.com',
          password
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    it('should prevent role escalation during login', async () => {
      // The schema should strip it or service ignores it, but let's test it doesn't do anything
      const password = 'password';
      const passwordHash = await hashPassword(password);
      
      await User.create({
        email: 'hacker@example.com',
        passwordHash,
        role: ROLES.EMPLOYEE
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'hacker@example.com',
          password,
          role: ROLES.SUPER_ADMIN // attempt to escalate
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe(ROLES.EMPLOYEE); // Role remains what's in DB
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let user;
    let validRefreshToken;

    beforeEach(async () => {
      const passwordHash = await hashPassword('password');
      user = await User.create({
        email: 'refresh@example.com',
        passwordHash,
      });

      // Login to get tokens
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'refresh@example.com', password: 'password' });
      
      validRefreshToken = getCookie(loginRes, 'refreshToken');
    });

    it('should rotate tokens and return success with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const setCookie = res.headers['set-cookie'];
      expect(setCookie.some(c => c.includes('accessToken='))).toBe(true);
      expect(setCookie.some(c => c.includes('refreshToken='))).toBe(true);

      const newRefreshToken = getCookie(res, 'refreshToken');
      expect(newRefreshToken).not.toBe(validRefreshToken); // Token rotated

      // Verify old session revoked in DB
      const sessions = await Session.find({ user: user._id }).sort({ createdAt: -1 });
      expect(sessions.length).toBe(2);
      
      const oldSession = sessions.find(s => s.revokedAt !== null);
      const newSession = sessions.find(s => s.revokedAt === null);
      
      expect(oldSession).toBeDefined();
      expect(newSession).toBeDefined();
    });

    it('should fail with a previously revoked token (reuse detection)', async () => {
      // First rotation
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshToken}`]);

      // Attempt to reuse the OLD token
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should fail if user account becomes inactive', async () => {
      await User.findByIdAndUpdate(user._id, { status: ACCOUNT_STATUS.INACTIVE });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear cookies and revoke session', async () => {
      const passwordHash = await hashPassword('password');
      const user = await User.create({ email: 'logout@example.com', passwordHash });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'logout@example.com', password: 'password' });
      
      const refreshToken = getCookie(loginRes, 'refreshToken');

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      
      // Cookies should be cleared (maxAge=0 or expires in past)
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(setCookie.some(c => c.includes('accessToken=;') || c.includes('Max-Age=0') || c.includes('Expires='))).toBe(true);

      // Verify session revoked
      const session = await Session.findOne({ user: user._id });
      expect(session.revokedAt).not.toBeNull();
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    it('should revoke all sessions for the authenticated user', async () => {
      const passwordHash = await hashPassword('password');
      const user = await User.create({ email: 'logoutall@example.com', passwordHash });

      // Login twice to create 2 sessions
      await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'password' });
      const login2 = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'password' });

      const accessToken = getCookie(login2, 'accessToken');

      // Logout all
      const res = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toBe(200);

      // Verify all sessions revoked
      const sessions = await Session.find({ user: user._id });
      expect(sessions.length).toBe(2);
      expect(sessions[0].revokedAt).not.toBeNull();
      expect(sessions[1].revokedAt).not.toBeNull();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return safe user info for authenticated user', async () => {
      const passwordHash = await hashPassword('password');
      const user = await User.create({ email: 'me@example.com', passwordHash });

      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'password' });
      const accessToken = getCookie(loginRes, 'accessToken');

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });
});

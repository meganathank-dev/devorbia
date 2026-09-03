
const { hashPassword, comparePassword } = require('../src/utils/password.util');
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken } = require('../src/utils/token.util');
const User = require('../src/models/user.model');
const Session = require('../src/models/session.model');

describe('Authentication Foundation', () => {
  describe('Password Utility', () => {
    it('should hash a password differently than the plaintext', async () => {
      const plaintext = 'SuperSecretPassword123!';
      const hash = await hashPassword(plaintext);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(plaintext);
      expect(hash.startsWith('$argon2')).toBe(true); // argon2id format
    });

    it('should successfully verify a correct password', async () => {
      const plaintext = 'SuperSecretPassword123!';
      const hash = await hashPassword(plaintext);
      const isMatch = await comparePassword(plaintext, hash);
      
      expect(isMatch).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const plaintext = 'SuperSecretPassword123!';
      const hash = await hashPassword(plaintext);
      const isMatch = await comparePassword('WrongPassword!', hash);
      
      expect(isMatch).toBe(false);
    });
  });

  describe('Token Utility', () => {
    const payload = { id: 'test-user-id', role: 'EMPLOYEE' };

    it('should generate a valid access token', () => {
      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      
      const decoded = verifyAccessToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.exp).toBeDefined();
    });

    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken({ id: payload.id });
      expect(token).toBeDefined();
      
      const decoded = verifyRefreshToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.role).toBeUndefined(); // Refresh shouldn't necessarily have role
      expect(decoded.exp).toBeDefined();
    });

    it('should hash a token securely (not plaintext)', () => {
      const token = 'sample-refresh-token';
      const hashed = hashToken(token);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(token);
      expect(hashed.length).toBe(64); // sha256 hex length
    });
  });

  describe('Model Constraints', () => {
    it('User model should require email and passwordHash', () => {
      const user = new User();
      const err = user.validateSync();
      
      expect(err.errors.email).toBeDefined();
      expect(err.errors.passwordHash).toBeDefined();
      expect(err.errors.role).toBeUndefined(); // Has default
    });

    it('Session model should require user, tokenHash, expiresAt', () => {
      const session = new Session();
      const err = session.validateSync();
      
      expect(err.errors.user).toBeDefined();
      expect(err.errors.tokenHash).toBeDefined();
      expect(err.errors.expiresAt).toBeDefined();
    });
  });
});

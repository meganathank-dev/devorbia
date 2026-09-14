const { execSync } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const bootstrapScriptPath = path.resolve(__dirname, '../scripts/bootstrap.js');

describe('Bootstrap CLI Script', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    process.env.MONGOMS_SYSTEM_BINARY = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    const conn = await mongoose.connect(mongoUri);
    await conn.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const runBootstrap = (env) => {
    try {
      const output = execSync(`node ${bootstrapScriptPath}`, {
        env: { ...process.env, ...env },
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      return { success: true, output };
    } catch (error) {
      return { success: false, output: error.stderr || error.stdout, error };
    }
  };

  it('should fail safely if missing required bootstrap configuration', () => {
    const result = runBootstrap({
      MONGODB_URI: mongoUri,
      BOOTSTRAP_SECRET: '',
    });
    expect(result.success).toBe(false);
    expect(result.output).toContain('Missing required bootstrap configuration');
  });

  it('should bootstrap successfully with valid environment configuration (no CLI args)', () => {
    const result = runBootstrap({
      MONGODB_URI: mongoUri,
      BOOTSTRAP_SECRET: 'test_secret',
      BOOTSTRAP_ORG_NAME: 'Test Org',
      BOOTSTRAP_ORG_SLUG: 'test-org',
      BOOTSTRAP_OWNER_EMAIL: 'owner@test.com',
      BOOTSTRAP_OWNER_PASSWORD: 'password123',
    });
    
    expect(result.success).toBe(true);
    expect(result.output).toContain('SYSTEM BOOTSTRAP SUCCESSFUL');
    expect(result.output).toContain('owner@test.com');
    // Ensure the secret wasn't leaked in logs
    expect(result.output).not.toContain('test_secret');
    expect(result.output).not.toContain('password123');
  });

  it('should refuse to run if the system is already bootstrapped (idempotency)', () => {
    // 1st run
    const result1 = runBootstrap({
      MONGODB_URI: mongoUri,
      BOOTSTRAP_SECRET: 'test_secret',
      BOOTSTRAP_ORG_NAME: 'Test Org',
      BOOTSTRAP_ORG_SLUG: 'test-org',
      BOOTSTRAP_OWNER_EMAIL: 'owner@test.com',
      BOOTSTRAP_OWNER_PASSWORD: 'password123',
    });
    expect(result1.success).toBe(true);

    // 2nd run
    const result2 = runBootstrap({
      MONGODB_URI: mongoUri,
      BOOTSTRAP_SECRET: 'test_secret',
      BOOTSTRAP_ORG_NAME: 'Another Org',
      BOOTSTRAP_ORG_SLUG: 'another-org',
      BOOTSTRAP_OWNER_EMAIL: 'owner2@test.com',
      BOOTSTRAP_OWNER_PASSWORD: 'password123',
    });
    expect(result2.success).toBe(false);
    expect(result2.output).toContain('System already bootstrapped: organizations exist.');
  });
});

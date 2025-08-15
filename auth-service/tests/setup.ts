import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock environment variables for tests (must be set BEFORE importing app code)
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/purdue_auth_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
process.env.SESSION_SECRET = 'test-session-secret-min-32-characters-long';
process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters-long';
process.env.AZURE_CLIENT_ID = 'test-client-id';
process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
process.env.AZURE_TENANT_ID = 'test-tenant-id';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.FALLBACK_MAGIC_LINK = 'false';
process.env.ENABLE_AUDIT_LOGS = 'true';
process.env.ENABLE_RATE_LIMITING = 'false'; // Disable for tests

// Import after env is configured
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require('../src/config/database');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { redisClient } = require('../src/config/redis');

// Global test setup
beforeAll(async () => {
  // Reset database (best-effort in CI/dev)
  try {
    await prisma.$executeRaw`TRUNCATE TABLE "users", "accounts", "sessions", "verification_tokens", "profiles", "magic_links", "audit_logs", "rate_limits" RESTART IDENTITY CASCADE`;
  } catch (e) {
    // Ignore if DB not available
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear Redis test database
  try {
    if (redisClient.isOpen) {
      await redisClient.flushDb();
    }
  } catch {}
  
  // Clean up database
  try {
    await prisma.auditLog.deleteMany();
    await prisma.magicLink.deleteMany();
    await prisma.rateLimit.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.verificationToken.deleteMany();
  } catch {}
});

// Global test teardown
afterAll(async () => {
  try { await prisma.$disconnect(); } catch {}
  try { if (redisClient.isOpen) { await redisClient.quit(); } } catch {}
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
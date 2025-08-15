"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const database_1 = require("../src/config/database");
const redis_1 = require("../src/config/redis");
// Load test environment variables
(0, dotenv_1.config)({ path: '.env.test' });
// Mock environment variables for tests
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
// Global test setup
beforeAll(async () => {
    // Reset database
    await database_1.prisma.$executeRaw `TRUNCATE TABLE "users", "accounts", "sessions", "verification_tokens", "profiles", "magic_links", "audit_logs", "rate_limits" RESTART IDENTITY CASCADE`;
});
// Clean up after each test
afterEach(async () => {
    // Clear Redis test database
    if (redis_1.redisClient.isOpen) {
        await redis_1.redisClient.flushDb();
    }
    // Clean up database
    await database_1.prisma.auditLog.deleteMany();
    await database_1.prisma.magicLink.deleteMany();
    await database_1.prisma.rateLimit.deleteMany();
    await database_1.prisma.session.deleteMany();
    await database_1.prisma.account.deleteMany();
    await database_1.prisma.profile.deleteMany();
    await database_1.prisma.user.deleteMany();
    await database_1.prisma.verificationToken.deleteMany();
});
// Global test teardown
afterAll(async () => {
    await database_1.prisma.$disconnect();
    if (redis_1.redisClient.isOpen) {
        await redis_1.redisClient.quit();
    }
});
// Mock console methods to reduce test noise
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};
//# sourceMappingURL=setup.js.map
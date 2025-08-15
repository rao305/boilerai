import { prisma } from '../../src/config/database';
import magicLinkService from '../../src/services/magicLinkService';

// Mock email service
jest.mock('../../src/services/emailService', () => ({
  sendMagicLinkEmail: jest.fn().mockResolvedValue(true)
}));

describe('MagicLinkService', () => {
  // Enable magic link for tests
  beforeAll(() => {
    process.env.FALLBACK_MAGIC_LINK = 'true';
    process.env.MAGIC_LINK_EXPIRES_IN = '10m';
  });

  afterAll(() => {
    process.env.FALLBACK_MAGIC_LINK = 'false';
  });

  describe('createMagicLink', () => {
    it('should create magic link for valid Purdue email', async () => {
      const result = await magicLinkService.createMagicLink({
        email: 'test@purdue.edu',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser'
      });

      expect(result.success).toBe(true);

      // Verify magic link was created
      const magicLinks = await prisma.magicLink.findMany({
        where: { email: 'test@purdue.edu' }
      });

      expect(magicLinks).toHaveLength(1);
      expect(magicLinks[0].used).toBe(false);
      expect(magicLinks[0].ipAddress).toBe('192.168.1.1');
    });

    it('should reject non-Purdue email', async () => {
      const result = await magicLinkService.createMagicLink({
        email: 'test@gmail.com',
        ipAddress: '192.168.1.1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only Purdue University emails are allowed');
    });

    it('should enforce rate limiting', async () => {
      const email = 'ratelimit@purdue.edu';

      // Create 3 magic links (at the limit)
      for (let i = 0; i < 3; i++) {
        const result = await magicLinkService.createMagicLink({
          email,
          ipAddress: '192.168.1.1'
        });
        expect(result.success).toBe(true);
      }

      // 4th attempt should be rate limited
      const result = await magicLinkService.createMagicLink({
        email,
        ipAddress: '192.168.1.1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many magic link requests');
    });

    it('should create user if not exists', async () => {
      const email = 'newuser@purdue.edu';

      // Verify user doesn't exist
      const userBefore = await prisma.user.findUnique({
        where: { emailNormalized: email }
      });
      expect(userBefore).toBeNull();

      const result = await magicLinkService.createMagicLink({
        email,
        ipAddress: '192.168.1.1'
      });

      expect(result.success).toBe(true);

      // Verify user was created
      const userAfter = await prisma.user.findUnique({
        where: { emailNormalized: email },
        include: { profile: true }
      });

      expect(userAfter).not.toBeNull();
      expect(userAfter!.email).toBe(email);
      expect(userAfter!.profile?.role).toBe('student');
    });

    it('should handle email sending failure', async () => {
      const { sendMagicLinkEmail } = require('../../src/services/emailService');
      sendMagicLinkEmail.mockResolvedValueOnce(false);

      const result = await magicLinkService.createMagicLink({
        email: 'emailfail@purdue.edu',
        ipAddress: '192.168.1.1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send email');

      // Verify magic link was cleaned up
      const magicLinks = await prisma.magicLink.findMany({
        where: { email: 'emailfail@purdue.edu' }
      });
      expect(magicLinks).toHaveLength(0);
    });

    it('should return error when feature disabled', async () => {
      process.env.FALLBACK_MAGIC_LINK = 'false';

      const result = await magicLinkService.createMagicLink({
        email: 'test@purdue.edu',
        ipAddress: '192.168.1.1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Magic link authentication is disabled');

      process.env.FALLBACK_MAGIC_LINK = 'true';
    });
  });

  describe('validateMagicLink', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create a user and magic link for testing
      const user = await prisma.user.create({
        data: {
          email: 'test@purdue.edu',
          emailNormalized: 'test@purdue.edu',
          profile: {
            create: { role: 'student' }
          }
        }
      });
      userId = user.id;

      const magicLink = await prisma.magicLink.create({
        data: {
          userId: user.id,
          token: 'valid-test-token',
          email: 'test@purdue.edu',
          expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          ipAddress: '192.168.1.1'
        }
      });
      validToken = magicLink.token;
    });

    it('should validate valid magic link', async () => {
      const result = await magicLinkService.validateMagicLink(validToken, '192.168.1.1');

      expect(result.isValid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe(userId);

      // Verify magic link was marked as used
      const magicLink = await prisma.magicLink.findUnique({
        where: { token: validToken }
      });

      expect(magicLink!.used).toBe(true);
      expect(magicLink!.usedAt).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const result = await magicLinkService.validateMagicLink('invalid-token', '192.168.1.1');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid or expired magic link');
    });

    it('should reject already used token', async () => {
      // Use the token first time
      await magicLinkService.validateMagicLink(validToken, '192.168.1.1');

      // Try to use again
      const result = await magicLinkService.validateMagicLink(validToken, '192.168.1.1');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Magic link has already been used');
    });

    it('should reject expired token', async () => {
      // Create expired magic link
      const expiredMagicLink = await prisma.magicLink.create({
        data: {
          userId: userId,
          token: 'expired-token',
          email: 'test@purdue.edu',
          expires: new Date(Date.now() - 1000), // 1 second ago
          ipAddress: '192.168.1.1'
        }
      });

      const result = await magicLinkService.validateMagicLink('expired-token', '192.168.1.1');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Magic link has expired');

      // Verify expired link was deleted
      const deletedLink = await prisma.magicLink.findUnique({
        where: { token: 'expired-token' }
      });
      expect(deletedLink).toBeNull();
    });

    it('should update user last login time', async () => {
      const userBefore = await prisma.user.findUnique({
        where: { id: userId }
      });

      await magicLinkService.validateMagicLink(validToken, '192.168.1.1');

      const userAfter = await prisma.user.findUnique({
        where: { id: userId }
      });

      expect(userAfter!.lastLoginAt).not.toEqual(userBefore!.lastLoginAt);
      expect(userAfter!.lastLoginAt).toBeDefined();
    });
  });

  describe('cleanupExpiredMagicLinks', () => {
    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: 'cleanup@purdue.edu',
          emailNormalized: 'cleanup@purdue.edu',
          profile: { create: { role: 'student' } }
        }
      });

      // Create expired magic link
      await prisma.magicLink.create({
        data: {
          userId: user.id,
          token: 'expired-link',
          email: 'cleanup@purdue.edu',
          expires: new Date(Date.now() - 1000), // 1 second ago
          ipAddress: '192.168.1.1'
        }
      });

      // Create valid magic link
      await prisma.magicLink.create({
        data: {
          userId: user.id,
          token: 'valid-link',
          email: 'cleanup@purdue.edu',
          expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          ipAddress: '192.168.1.1'
        }
      });
    });

    it('should clean up expired magic links', async () => {
      const deletedCount = await magicLinkService.cleanupExpiredMagicLinks();

      expect(deletedCount).toBe(1);

      const remainingLinks = await prisma.magicLink.findMany();
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0].token).toBe('valid-link');
    });
  });

  describe('getMagicLinkStats', () => {
    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: 'stats@purdue.edu',
          emailNormalized: 'stats@purdue.edu',
          profile: { create: { role: 'student' } }
        }
      });

      // Create used magic link
      const usedLink = await prisma.magicLink.create({
        data: {
          userId: user.id,
          token: 'used-link',
          email: 'stats@purdue.edu',
          expires: new Date(Date.now() + 10 * 60 * 1000),
          used: true,
          usedAt: new Date(),
          ipAddress: '192.168.1.1'
        }
      });

      // Create unused magic link
      await prisma.magicLink.create({
        data: {
          userId: user.id,
          token: 'unused-link',
          email: 'stats@purdue.edu',
          expires: new Date(Date.now() + 10 * 60 * 1000),
          ipAddress: '192.168.1.1'
        }
      });

      // Create expired unused magic link
      await prisma.magicLink.create({
        data: {
          userId: user.id,
          token: 'expired-unused-link',
          email: 'stats@purdue.edu',
          expires: new Date(Date.now() - 1000), // Expired
          ipAddress: '192.168.1.1'
        }
      });
    });

    it('should calculate magic link statistics', async () => {
      const stats = await magicLinkService.getMagicLinkStats();

      expect(stats.sent).toBe(3);
      expect(stats.used).toBe(1);
      expect(stats.expired).toBe(1);
      expect(stats.conversionRate).toBe(33.333333333333336); // 1/3 * 100
    });
  });
});
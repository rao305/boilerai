import { prisma } from '../../src/config/database';
import auditService, { createAuditLog } from '../../src/services/auditService';

describe('AuditService', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@purdue.edu',
        emailNormalized: 'test@purdue.edu',
        profile: {
          create: {
            role: 'student'
          }
        }
      }
    });
    testUserId = user.id;
  });

  describe('createAuditLog', () => {
    it('should create audit log with all fields', async () => {
      await createAuditLog({
        userId: testUserId,
        action: 'login',
        details: { provider: 'azure-ad' },
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        success: true
      });

      const logs = await prisma.auditLog.findMany({
        where: { userId: testUserId }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userId: testUserId,
        action: 'login',
        details: { provider: 'azure-ad' },
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        success: true
      });
    });

    it('should create audit log without user', async () => {
      await createAuditLog({
        action: 'failed_login',
        details: { email: 'invalid@example.com' },
        ipAddress: '192.168.1.1',
        success: false
      });

      const logs = await prisma.auditLog.findMany({
        where: { action: 'failed_login' }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userId: null,
        action: 'failed_login',
        success: false
      });
    });

    it('should handle minimal data', async () => {
      await createAuditLog({
        action: 'test_action',
        success: true
      });

      const logs = await prisma.auditLog.findMany({
        where: { action: 'test_action' }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('test_action');
      expect(logs[0].success).toBe(true);
    });
  });

  describe('getUserAuditLogs', () => {
    beforeEach(async () => {
      // Create multiple audit logs
      for (let i = 0; i < 5; i++) {
        await createAuditLog({
          userId: testUserId,
          action: `action_${i}`,
          success: true
        });
      }
    });

    it('should retrieve user audit logs with default limit', async () => {
      const logs = await auditService.getUserAuditLogs(testUserId);
      
      expect(logs).toHaveLength(5);
      expect(logs[0].action).toBe('action_4'); // Most recent first
    });

    it('should respect limit and offset', async () => {
      const logs = await auditService.getUserAuditLogs(testUserId, 2, 1);
      
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('action_3');
      expect(logs[1].action).toBe('action_2');
    });
  });

  describe('getFailedLoginsByIP', () => {
    const testIP = '192.168.1.100';

    beforeEach(async () => {
      // Create failed login attempts
      await createAuditLog({
        action: 'failed_login',
        ipAddress: testIP,
        success: false
      });

      await createAuditLog({
        action: 'failed_login',
        ipAddress: testIP,
        success: false
      });

      // Create successful login (should not be included)
      await createAuditLog({
        action: 'login',
        ipAddress: testIP,
        success: true
      });
    });

    it('should retrieve failed logins by IP', async () => {
      const failedLogins = await auditService.getFailedLoginsByIP(testIP);
      
      expect(failedLogins).toHaveLength(2);
      failedLogins.forEach(log => {
        expect(log.action).toBe('failed_login');
        expect(log.ipAddress).toBe(testIP);
        expect(log.success).toBe(false);
      });
    });

    it('should filter by time window', async () => {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      const failedLogins = await auditService.getFailedLoginsByIP(testIP, oneHourFromNow);
      
      expect(failedLogins).toHaveLength(0);
    });
  });

  describe('getAuthStats', () => {
    beforeEach(async () => {
      // Create various audit logs
      await createAuditLog({
        userId: testUserId,
        action: 'login',
        success: true
      });

      await createAuditLog({
        action: 'failed_login',
        success: false
      });

      await createAuditLog({
        action: 'failed_login',
        success: false
      });
    });

    it('should calculate authentication statistics', async () => {
      const stats = await auditService.getAuthStats();
      
      expect(stats.successfulLogins).toBe(1);
      expect(stats.failedLogins).toBe(2);
      expect(stats.successRate).toBe(33.333333333333336); // 1/3 * 100
      expect(stats.totalUsers).toBe(1);
    });
  });

  describe('cleanupOldAuditLogs', () => {
    beforeEach(async () => {
      // Create old log (simulate by manipulating createdAt)
      const oldLog = await prisma.auditLog.create({
        data: {
          action: 'old_action',
          success: true
        }
      });

      // Update to make it old
      await prisma.auditLog.update({
        where: { id: oldLog.id },
        data: {
          createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
        }
      });

      // Create recent log
      await createAuditLog({
        action: 'recent_action',
        success: true
      });
    });

    it('should clean up old audit logs', async () => {
      const deletedCount = await auditService.cleanupOldAuditLogs(90);
      
      expect(deletedCount).toBe(1);
      
      const remainingLogs = await prisma.auditLog.findMany();
      expect(remainingLogs).toHaveLength(1);
      expect(remainingLogs[0].action).toBe('recent_action');
    });

    it('should not delete recent logs', async () => {
      const deletedCount = await auditService.cleanupOldAuditLogs(1);
      
      expect(deletedCount).toBe(1);
      
      const remainingLogs = await prisma.auditLog.findMany();
      expect(remainingLogs).toHaveLength(1);
    });
  });
});
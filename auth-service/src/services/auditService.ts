import { prisma } from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';

export interface AuditLogData {
  userId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

/**
 * Creates an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  // Skip if audit logging is disabled
  if (!env.ENABLE_AUDIT_LOGS) {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        details: (data.details as any) ?? undefined,
        ipAddress: (data.ipAddress as string) ?? null,
        userAgent: (data.userAgent as string) ?? null,
        success: data.success
      }
    });

    logger.debug('Audit log created', {
      action: data.action,
      userId: data.userId,
      success: data.success
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Gets audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      action: true,
      details: true,
      ipAddress: true,
      success: true,
      createdAt: true
      // Exclude sensitive userAgent data from general queries
    }
  });
}

/**
 * Gets audit logs by action type
 */
export async function getAuditLogsByAction(
  action: string,
  limit: number = 100,
  offset: number = 0
) {
  return await prisma.auditLog.findMany({
    where: { action },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
}

/**
 * Gets failed login attempts by IP
 */
export async function getFailedLoginsByIP(
  ipAddress: string,
  timeWindow: Date = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
) {
  return await prisma.auditLog.findMany({
    where: {
      action: 'failed_login',
      ipAddress,
      success: false,
      createdAt: {
        gte: timeWindow
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Cleans up old audit logs
 */
export async function cleanupOldAuditLogs(
  daysToKeep: number = 90
): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  });

  logger.info(`Cleaned up ${result.count} old audit logs older than ${daysToKeep} days`);
  return result.count;
}

/**
 * Gets authentication statistics
 */
export async function getAuthStats(
  startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  endDate: Date = new Date()
) {
  const [successfulLogins, failedLogins, totalUsers, newUsers] = await Promise.all([
    // Successful logins
    prisma.auditLog.count({
      where: {
        action: 'login',
        success: true,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }),
    
    // Failed logins
    prisma.auditLog.count({
      where: {
        action: 'failed_login',
        success: false,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }),
    
    // Total users
    prisma.user.count(),
    
    // New users in period
    prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })
  ]);

  return {
    successfulLogins,
    failedLogins,
    totalUsers,
    newUsers,
    successRate: successfulLogins + failedLogins > 0 
      ? (successfulLogins / (successfulLogins + failedLogins)) * 100 
      : 0
  };
}

export default {
  createAuditLog,
  getUserAuditLogs,
  getAuditLogsByAction,
  getFailedLoginsByIP,
  cleanupOldAuditLogs,
  getAuthStats
};
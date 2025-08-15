import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { prisma } from '../config/database';
import { checkDatabaseConnection } from '../config/database';
import { checkRedisConnection } from '../config/redis';
import { redisClient } from '../config/redis';
import auditService from '../services/auditService';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/health - Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const checks = await Promise.allSettled([
      checkDatabaseConnection(),
      checkRedisConnection()
    ]);

    const dbHealthy = checks[0].status === 'fulfilled' && checks[0].value;
    const redisHealthy = checks[1].status === 'fulfilled' && checks[1].value;

    const healthy = dbHealthy && redisHealthy;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

/**
 * GET /api/stats - Authentication statistics (admin only)
 */
router.get('/stats', 
  requireAuth,
  requireRole(['admin', 'staff']),
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10
  }),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt((req.query as any)['days'] as string) || 7;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const stats = await auditService.getAuthStats(startDate);
      
      res.json({
        period: `${days} days`,
        stats
      });
    } catch (error) {
      logger.error('Error fetching auth stats:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics'
      });
    }
  }
);

/**
 * GET /api/audit-logs - Get audit logs (admin only)
 */
router.get('/audit-logs',
  requireAuth,
  requireRole(['admin']),
  rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20
  }),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt((req.query as any)['page'] as string) || 1;
      const limit = Math.min(parseInt((req.query as any)['limit'] as string) || 50, 100);
      const offset = (page - 1) * limit;
      const action = (req.query as any)['action'] as string;

      let logs;
      if (action) {
        logs = await auditService.getAuditLogsByAction(action, limit, offset);
      } else {
        // Get all audit logs
        logs = await prisma.auditLog.findMany({
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

      res.json({
        logs,
        pagination: {
          page,
          limit,
          hasMore: logs.length === limit
        }
      });
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      res.status(500).json({
        error: 'Failed to fetch audit logs'
      });
    }
  }
);

/**
 * GET /api/users - Get users list (admin only)
 */
router.get('/users',
  requireAuth,
  requireRole(['admin']),
  rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10
  }),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt((req.query as any)['page'] as string) || 1;
      const limit = Math.min(parseInt((req.query as any)['limit'] as string) || 20, 100);
      const offset = (page - 1) * limit;
      const search = (req.query as any)['search'] as string;

      const where = search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {};

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          lastLoginAt: true,
          createdAt: true,
          profile: {
            select: {
              displayName: true,
              role: true,
              department: true,
              year: true
            }
          }
        }
      });

      const total = await prisma.user.count({ where });

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        error: 'Failed to fetch users'
      });
    }
  }
);

/**
 * PUT /api/users/:id/role - Update user role (admin only)
 */
router.put('/users/:id/role',
  requireAuth,
  requireRole(['admin']),
  rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['student', 'faculty', 'staff', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          validRoles
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: id as string },
        include: { profile: true }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      await prisma.profile.update({
        where: { userId: id as string },
        data: { role }
      });

      // Create audit log
      await auditService.createAuditLog({
        userId: req.user!.id,
        action: 'role_change',
        details: {
          targetUserId: id,
          targetUserEmail: user.email,
          oldRole: (user as any).profile?.role,
          newRole: role
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true
      });

      logger.info('User role updated', {
        adminUserId: req.user!.id,
        targetUserId: id,
        oldRole: (user as any).profile?.role,
        newRole: role
      });

      res.json({
        success: true,
        message: 'User role updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user role:', error);
      res.status(500).json({
        error: 'Failed to update user role'
      });
    }
  }
);

/**
 * GET /api/profile - Get current user's profile
 */
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profile: user.profile
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * PUT /api/profile - Update current user's profile
 */
router.put('/profile',
  requireAuth,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10
  }),
  async (req: Request, res: Response) => {
    try {
      const { displayName, department, year } = req.body;

      // Validate input
      if (displayName && typeof displayName !== 'string') {
        return res.status(400).json({
          error: 'Invalid displayName'
        });
      }

      if (department && typeof department !== 'string') {
        return res.status(400).json({
          error: 'Invalid department'
        });
      }

      if (year && !['freshman', 'sophomore', 'junior', 'senior', 'graduate'].includes(year)) {
        return res.status(400).json({
          error: 'Invalid year',
          validValues: ['freshman', 'sophomore', 'junior', 'senior', 'graduate']
        });
      }

      const updatedProfile = await prisma.profile.update({
        where: { userId: req.user!.id },
        data: {
          ...(displayName && { displayName }),
          ...(department && { department }),
          ...(year && { year })
        }
      });

      res.json({
        success: true,
        profile: updatedProfile
      });
    } catch (error) {
      logger.error('Error updating profile:', error);
      res.status(500).json({
        error: 'Failed to update profile'
      });
    }
  }
);

export default router;
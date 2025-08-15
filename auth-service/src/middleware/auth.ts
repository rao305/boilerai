import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import logger from '../utils/logger';
import { createAuditLog } from '../services/auditService';

// Extend Express Request interface
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      emailNormalized: string;
      name?: string;
      image?: string;
      azureId?: string;
      tenantId?: string;
      upn?: string;
      createdAt: Date;
      updatedAt: Date;
      lastLoginAt?: Date;
      profile?: {
        id: string;
        displayName?: string;
        role: string;
        department?: string;
        year?: string;
      };
    }

    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    logger.warn('Unauthorized access attempt', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please sign in to access this resource'
    });
  }

  return next();
}

/**
 * Middleware to optionally get user if authenticated
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // User will be available in req.user if authenticated, undefined otherwise
  next();
}

/**
 * Middleware to require specific role
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please sign in to access this resource'
      });
    }

    const userRole = req.user.profile?.role;
    if (!userRole || !roles.includes(userRole)) {
      logger.warn('Access denied - insufficient privileges', {
        userId: req.user.id,
        userRole,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip
      });

      // Log security event
      createAuditLog({
        userId: req.user.id,
        action: 'access_denied',
        details: {
          path: req.path,
          method: req.method,
          userRole,
          requiredRoles: roles
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: false
      });

      return res.status(403).json({
        error: 'Insufficient privileges',
        message: 'You do not have permission to access this resource'
      });
    }

    return next();
  };
}

/**
 * Middleware to validate session and refresh if needed
 */
export async function validateSession(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return next();
  }

  try {
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true }
    });

    if (!user) {
      logger.warn('Session validation failed - user not found', {
        userId: req.user.id,
        sessionId: req.sessionID
      });

      req.logout((err) => {
        if (err) {
          logger.error('Error during logout:', err);
        }
      });

      return res.status(401).json({
        error: 'Session invalid',
        message: 'Please sign in again'
      });
    }

    // Update user object with latest data
    req.user = user as Express.User;
    next();

  } catch (error) {
    logger.error('Session validation error:', error);
    next(error);
  }
}

/**
 * Middleware to track user activity
 */
export function trackActivity(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) {
    // Update last activity timestamp (non-blocking)
    prisma.user.update({
      where: { id: req.user.id },
      data: { lastLoginAt: new Date() }
    }).catch(error => {
      logger.error('Failed to update user activity:', error);
    });
  }

  return next();
}

/**
 * Middleware to ensure user has Purdue email domain
 */
export function requirePurdueEmail(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please sign in to access this resource'
    });
  }

  const email = req.user.email;
  if (!email || !email.toLowerCase().endsWith('@purdue.edu')) {
    logger.warn('Access denied - non-Purdue email', {
      userId: req.user.id,
      email: email,
      path: req.path,
      ip: req.ip
    });

    createAuditLog({
      userId: req.user.id,
      action: 'access_denied',
      details: {
        reason: 'non_purdue_email',
        email: email,
        path: req.path
      },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') as string,
      success: false
    });

    return res.status(403).json({
      error: 'Access denied',
      message: 'Only Purdue University accounts are allowed'
    });
  }

  return next();
}

/**
 * Error handler for authentication errors
 */
export function authErrorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  if (error.name === 'AuthenticationError') {
    logger.warn('Authentication error', {
      error: error.message,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Please try signing in again'
    });
  }

  if (error.name === 'AuthorizationError') {
    logger.warn('Authorization error', {
      error: error.message,
      path: req.path,
      userId: req.user?.id,
      ip: req.ip
    });

    return res.status(403).json({
      error: 'Access denied',
      message: 'You do not have permission to access this resource'
    });
  }

  return next(error);
}
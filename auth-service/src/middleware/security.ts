import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { env } from '../config/env';
import logger from '../utils/logger';

/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Needed for Azure AD
        "https://login.microsoftonline.com",
        "https://login.microsoft.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://login.microsoftonline.com",
        "https://*.gravatar.com"
      ],
      connectSrc: [
        "'self'",
        "https://login.microsoftonline.com",
        "https://graph.microsoft.com"
      ],
      frameSrc: [
        "https://login.microsoftonline.com"
      ],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Azure AD compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  }
});

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  });

  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(error: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  next(error);
}

/**
 * Trusted proxy configuration
 */
export function configureTrustedProxies(app: any) {
  if (env.NODE_ENV === 'production') {
    // Trust first proxy (load balancer)
    app.set('trust proxy', 1);
  } else {
    // Development - trust all proxies
    app.set('trust proxy', true);
  }
}

/**
 * Request size limits
 */
export const requestSizeLimits = {
  json: { limit: '1mb' },
  urlencoded: { extended: true, limit: '1mb' }
};

/**
 * Security validation middleware
 */
export function validateSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Check for security headers on sensitive endpoints
  const sensitiveEndpoints = ['/auth/', '/api/admin/'];
  const isSensitive = sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));

  if (isSensitive && req.method === 'POST') {
    // Ensure Content-Type is properly set
    const contentType = req.get('Content-Type');
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded'))) {
      logger.warn('Invalid Content-Type for sensitive endpoint', {
        path: req.path,
        contentType,
        ip: req.ip
      });

      return res.status(400).json({
        error: 'Invalid request',
        message: 'Invalid Content-Type header'
      });
    }
  }

  return next();
}

/**
 * IP allowlist middleware (for admin endpoints)
 */
export function requireAllowedIP(allowedIPs: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || '';

    if (!allowedIPs.includes(clientIP)) {
      logger.warn('Access denied - IP not in allowlist', {
        clientIP,
        path: req.path,
        allowedIPs
      });

      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not allowed to access this resource'
      });
    }

    return next();
  };
}

/**
 * Anti-CSRF middleware for state parameters
 */
export function validateStateParameter(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/auth/azure/callback' && req.method === 'POST') {
    const state = (req as any).body?.state;
    const sessionState = (req.session as any)?.oauthState;

    if (!state || !sessionState || state !== sessionState) {
      logger.warn('CSRF attack detected - invalid state parameter', {
        receivedState: state,
        expectedState: sessionState,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request validation failed'
      });
    }

    // Clear the state after successful validation
    delete (req.session as any).oauthState;
  }

  return next();
}

/**
 * Prevent cache for sensitive responses
 */
export function noCache(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}
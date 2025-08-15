import winston from 'winston';
import { env } from '../config/env';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger instance
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: 'purdue-auth-service',
    environment: env.NODE_ENV
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport in production
if (env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Security-focused logging functions
export const securityLogger = {
  authAttempt: (data: {
    email?: string;
    provider: string;
    success: boolean;
    ip?: string;
    userAgent?: string;
  }) => {
    logger.info('Authentication attempt', {
      event: 'auth_attempt',
      ...data,
      // Redact sensitive information
      email: data.email ? data.email.replace(/(.{2}).*@/, '$1***@') : undefined
    });
  },

  suspiciousActivity: (data: {
    type: string;
    details: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }) => {
    logger.warn('Suspicious activity detected', {
      event: 'suspicious_activity',
      ...data
    });
  },

  rateLimitExceeded: (data: {
    ip: string;
    endpoint: string;
    attempts: number;
  }) => {
    logger.warn('Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      ...data
    });
  }
};

// Performance logging
export const performanceLogger = {
  requestTime: (data: {
    method: string;
    url: string;
    duration: number;
    statusCode: number;
  }) => {
    if (data.duration > 1000) { // Log slow requests (> 1s)
      logger.warn('Slow request detected', {
        event: 'slow_request',
        ...data
      });
    } else {
      logger.debug('Request completed', {
        event: 'request_completed',
        ...data
      });
    }
  }
};

// Redact sensitive information from logs
const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie'];

function redactSensitiveData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const redacted = { ...obj };
  
  for (const key in redacted) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

// Note: We avoid method overrides to keep winston typings happy. Redact manually at call sites if needed.

export { logger };
export default logger;
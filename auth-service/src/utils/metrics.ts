import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { env } from '../config/env';

/**
 * Custom metrics for authentication service
 */

const meterProvider = new MeterProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'purdue-auth-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
  }),
});

metrics.setGlobalMeterProvider(meterProvider);
const meter = metrics.getMeter('purdue-auth-service');

// Authentication metrics
export const authMetrics = {
  // Counter for login attempts
  loginAttempts: meter.createCounter('auth_login_attempts_total', {
    description: 'Total number of login attempts',
  }),

  // Counter for successful logins
  loginSuccesses: meter.createCounter('auth_login_successes_total', {
    description: 'Total number of successful logins',
  }),

  // Counter for failed logins
  loginFailures: meter.createCounter('auth_login_failures_total', {
    description: 'Total number of failed logins',
  }),

  // Counter for blocked login attempts
  loginBlocked: meter.createCounter('auth_login_blocked_total', {
    description: 'Total number of blocked login attempts',
  }),

  // Histogram for login duration
  loginDuration: meter.createHistogram('auth_login_duration_seconds', {
    description: 'Time taken for login process',
    boundaries: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),

  // Counter for magic link requests
  magicLinkRequests: meter.createCounter('auth_magic_link_requests_total', {
    description: 'Total number of magic link requests',
  }),

  // Counter for magic link successes
  magicLinkSuccesses: meter.createCounter('auth_magic_link_successes_total', {
    description: 'Total number of successful magic link authentications',
  }),

  // Counter for rate limit hits
  rateLimitHits: meter.createCounter('auth_rate_limit_hits_total', {
    description: 'Total number of rate limit hits',
  }),

  // Gauge for active sessions
  activeSessions: meter.createUpDownCounter('auth_active_sessions', {
    description: 'Number of active user sessions',
  }),

  // Counter for session refreshes
  sessionRefreshes: meter.createCounter('auth_session_refreshes_total', {
    description: 'Total number of session refreshes',
  }),
};

// System metrics
export const systemMetrics = {
  // Gauge for Redis connection status
  redisConnected: meter.createUpDownCounter('redis_connected', {
    description: 'Redis connection status (1 = connected, 0 = disconnected)',
  }),

  // Gauge for database connection status
  dbConnected: meter.createUpDownCounter('database_connected', {
    description: 'Database connection status (1 = connected, 0 = disconnected)',
  }),

  // Counter for database query errors
  dbErrors: meter.createCounter('database_errors_total', {
    description: 'Total number of database errors',
  }),

  // Counter for Redis errors
  redisErrors: meter.createCounter('redis_errors_total', {
    description: 'Total number of Redis errors',
  }),

  // Histogram for HTTP request duration
  httpRequestDuration: meter.createHistogram('http_request_duration_seconds', {
    description: 'Duration of HTTP requests',
    boundaries: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  }),

  // Counter for HTTP requests
  httpRequests: meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
  }),
};

// Security metrics
export const securityMetrics = {
  // Counter for security violations
  securityViolations: meter.createCounter('security_violations_total', {
    description: 'Total number of security violations',
  }),

  // Counter for CSRF attempts
  csrfAttempts: meter.createCounter('security_csrf_attempts_total', {
    description: 'Total number of CSRF attempts',
  }),

  // Counter for invalid tokens
  invalidTokens: meter.createCounter('security_invalid_tokens_total', {
    description: 'Total number of invalid token attempts',
  }),

  // Counter for suspicious activities
  suspiciousActivity: meter.createCounter('security_suspicious_activity_total', {
    description: 'Total number of suspicious activities detected',
  }),

  // Gauge for blocked IPs
  blockedIps: meter.createUpDownCounter('security_blocked_ips', {
    description: 'Number of currently blocked IP addresses',
  }),
};

/**
 * Record authentication attempt
 */
export function recordAuthAttempt(provider: string, success: boolean, userId?: string, reason?: string) {
  const labels = { provider };
  
  authMetrics.loginAttempts.add(1, labels);
  
  if (success) {
    authMetrics.loginSuccesses.add(1, { ...labels, user_id: userId || 'unknown' });
  } else {
    authMetrics.loginFailures.add(1, { ...labels, reason: reason || 'unknown' });
  }
}

/**
 * Record login duration
 */
export function recordLoginDuration(durationSeconds: number, provider: string) {
  authMetrics.loginDuration.record(durationSeconds, { provider });
}

/**
 * Record rate limit hit
 */
export function recordRateLimitHit(endpoint: string, ipAddress: string) {
  authMetrics.rateLimitHits.add(1, { 
    endpoint: endpoint.replace(/\/\d+/g, '/:id'), // Normalize dynamic paths
    ip_masked: ipAddress.split('.').slice(0, 2).join('.') + '.xxx.xxx' // Mask IP for privacy
  });
}

/**
 * Record magic link request
 */
export function recordMagicLinkRequest(success: boolean, email?: string) {
  const domain = email ? email.split('@')[1] : 'unknown';
  const labels = { domain };
  
  authMetrics.magicLinkRequests.add(1, labels);
  
  if (success) {
    authMetrics.magicLinkSuccesses.add(1, labels);
  }
}

/**
 * Update active sessions count
 */
export function updateActiveSessionsCount(count: number) {
  authMetrics.activeSessions.add(count);
}

/**
 * Record session refresh
 */
export function recordSessionRefresh(userId: string, success: boolean) {
  const labels = { success: success.toString() };
  authMetrics.sessionRefreshes.add(1, labels);
}

/**
 * Record security violation
 */
export function recordSecurityViolation(type: string, severity: 'low' | 'medium' | 'high' | 'critical') {
  securityMetrics.securityViolations.add(1, { type, severity });
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number) {
  const labels = { 
    method: method.toUpperCase(),
    route: route.replace(/\/\d+/g, '/:id'), // Normalize dynamic paths
    status_code: statusCode.toString(),
    status_class: `${Math.floor(statusCode / 100)}xx`
  };
  
  systemMetrics.httpRequests.add(1, labels);
  systemMetrics.httpRequestDuration.record(durationSeconds, labels);
}

/**
 * Update system health metrics
 */
export function updateSystemHealth(redis: boolean, database: boolean) {
  systemMetrics.redisConnected.add(redis ? 1 : -1);
  systemMetrics.dbConnected.add(database ? 1 : -1);
}

/**
 * Record database error
 */
export function recordDatabaseError(operation: string, error: string) {
  systemMetrics.dbErrors.add(1, { 
    operation,
    error_type: error.split(':')[0] || 'unknown'
  });
}

/**
 * Record Redis error
 */
export function recordRedisError(operation: string, error: string) {
  systemMetrics.redisErrors.add(1, { 
    operation,
    error_type: error.split(':')[0] || 'unknown'
  });
}

export default {
  authMetrics,
  systemMetrics,
  securityMetrics,
  recordAuthAttempt,
  recordLoginDuration,
  recordRateLimitHit,
  recordMagicLinkRequest,
  updateActiveSessionsCount,
  recordSessionRefresh,
  recordSecurityViolation,
  recordHttpRequest,
  updateSystemHealth,
  recordDatabaseError,
  recordRedisError,
};
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import logger, { securityLogger } from '../utils/logger';

export interface RateLimitOptions {
  windowMs: number;          // Time window in milliseconds
  max: number;               // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: any;
  statusCode?: number;
  headers?: boolean;
  skipRedis?: boolean;       // Fallback to memory if Redis unavailable
}

interface RateLimitInfo {
  totalHits: number;
  totalResets: number;
  resetTime: Date;
  remaining: number;
}

/**
 * In-memory fallback for rate limiting when Redis is unavailable
 */
class MemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<number> {
    const record = this.store.get(key);
    if (!record || Date.now() > record.resetTime) {
      return 0;
    }
    return record.count;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const resetTime = now + windowMs;
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // New window or expired
      const newRecord = { count: 1, resetTime };
      this.store.set(key, newRecord);
      return {
        totalHits: 1,
        totalResets: 1,
        resetTime: new Date(resetTime),
        remaining: 0
      };
    } else {
      // Increment existing
      record.count++;
      this.store.set(key, record);
      return {
        totalHits: record.count,
        totalResets: 0,
        resetTime: new Date(record.resetTime),
        remaining: 0
      };
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Global memory store fallback
const memoryStore = new MemoryStore();

// Cleanup memory store every 5 minutes
setInterval(() => {
  memoryStore.cleanup();
}, 5 * 60 * 1000);

/**
 * Generate rate limit key
 */
function defaultKeyGenerator(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const route = req.route?.path || req.path;
  return `ratelimit:${ip}:${route}`;
}

/**
 * Redis-based sliding window rate limiter
 */
async function slidingWindowRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitInfo> {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const multi = redisClient.multi();
    // Remove expired entries, add current, set expiry
    multi.zRemRangeByScore(key, 0, windowStart);
    multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    multi.expire(key, Math.ceil(windowMs / 1000));
    await multi.exec();

    const currentCount = await redisClient.zCard(key);
    const totalHits = currentCount + 1;
    const remaining = Math.max(0, maxRequests - totalHits);
    const resetTime = new Date(now + windowMs);

    return {
      totalHits,
      totalResets: 0,
      resetTime,
      remaining
    };
  } catch (error) {
    logger.warn('Redis rate limit failed, using memory fallback:', error);
    return await memoryStore.increment(key, windowMs);
  }
}

/**
 * Token bucket rate limiter for burst protection
 */
async function tokenBucketRateLimit(
  key: string,
  capacity: number,
  refillRate: number,
  refillPeriodMs: number
): Promise<{ allowed: boolean; tokensRemaining: number }> {
  const now = Date.now();
  const bucketKey = `bucket:${key}`;

  try {
    const bucketData = await redisClient.hGetAll(bucketKey);
    
    let tokens = parseFloat(bucketData['tokens'] || capacity.toString());
    let lastRefill = parseInt(bucketData['lastRefill'] || now.toString());
    
    // Calculate tokens to add based on time elapsed
    const timeSinceRefill = now - lastRefill;
    const periodsElapsed = Math.floor(timeSinceRefill / refillPeriodMs);
    const tokensToAdd = periodsElapsed * refillRate;
    
    tokens = Math.min(capacity, tokens + tokensToAdd);
    
    if (tokens >= 1) {
      // Allow request and consume token
      tokens -= 1;
      
      await redisClient.hSet(bucketKey, {
        tokens: tokens.toString(),
        lastRefill: now.toString()
      });
      
      await redisClient.expire(bucketKey, Math.ceil(refillPeriodMs * 2 / 1000));
      
      return { allowed: true, tokensRemaining: Math.floor(tokens) };
    } else {
      return { allowed: false, tokensRemaining: 0 };
    }
  } catch (error) {
    logger.warn('Token bucket rate limit failed:', error);
    // Default to allow on Redis failure
    return { allowed: true, tokensRemaining: capacity };
  }
}

/**
 * Main rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs = env.RATE_LIMIT_WINDOW_MS,
    max = env.RATE_LIMIT_MAX_ATTEMPTS,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = env.RATE_LIMIT_SKIP_SUCCESS,
    skipFailedRequests = false,
    message = { error: 'Too many requests', retryAfter: Math.ceil(windowMs / 1000) },
    statusCode = 429,
    headers = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if rate limiting is disabled
    if (!env.ENABLE_RATE_LIMITING) {
      return next();
    }

    try {
      const key = keyGenerator(req);
      
      // Check sliding window rate limit
      const limitInfo = await slidingWindowRateLimit(key, windowMs, max);
      
      // Set rate limit headers
      if (headers) {
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', limitInfo.remaining);
        res.setHeader('X-RateLimit-Reset', limitInfo.resetTime.toISOString());
        res.setHeader('X-RateLimit-Window', windowMs);
      }

      // Check if limit exceeded
      if (limitInfo.totalHits > max) {
        // Log rate limit exceeded
        securityLogger.rateLimitExceeded({
          ip: (req.ip || ''),
          endpoint: req.path,
          attempts: limitInfo.totalHits
        });

        // Set retry-after header
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));

        return res.status(statusCode).json(message);
      }

      // Track response for skip logic
      const originalSend = res.send;
      res.send = function(body: any) {
        const shouldSkip = 
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400);

        if (shouldSkip) {
          // Remove the request from rate limit count
          // Note: This is a simplified implementation
          // In production, you might want a more sophisticated approach
        }

        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Default to allow on error
      next();
    }
  };
}

/**
 * Burst protection middleware using token bucket
 */
export function burstProtection(
  capacity: number = 10,
  refillRate: number = 2,
  refillPeriodMs: number = 1000
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!env.ENABLE_RATE_LIMITING) {
      return next();
    }

    try {
      const key = `burst:${req.ip || ''}`;
      const result = await tokenBucketRateLimit(key, capacity, refillRate, refillPeriodMs);

      if (!result.allowed) {
        securityLogger.rateLimitExceeded({
          ip: (req.ip || ''),
          endpoint: req.path,
          attempts: capacity
        });

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests in quick succession'
        });
      }

      res.setHeader('X-Burst-Tokens-Remaining', result.tokensRemaining);
      next();
    } catch (error) {
      logger.error('Burst protection error:', error);
      next();
    }
  };
}

/**
 * Progressive rate limiting - stricter limits for repeated violations
 */
export function progressiveRateLimit(baseOptions: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!env.ENABLE_RATE_LIMITING) {
      return next();
    }

    try {
      const key = baseOptions.keyGenerator ? baseOptions.keyGenerator(req) : defaultKeyGenerator(req);
      const violationKey = `violations:${key}`;
      
      // Get violation count
      const violations = await redisClient.get(violationKey) || '0';
      const violationCount = parseInt(violations);
      
      // Calculate adjusted limits based on violations
      const limitMultiplier = Math.max(0.1, 1 - (violationCount * 0.2));
      const adjustedMax = Math.max(1, Math.floor(baseOptions.max * limitMultiplier));
      
      // Apply rate limit with adjusted values
      const adjustedOptions = {
        ...baseOptions,
        max: adjustedMax
      };
      
      return rateLimit(adjustedOptions)(req, res, (err) => {
        // If rate limit was hit, increment violation count
        if (res.statusCode === 429) {
          redisClient.setEx(violationKey, 24 * 60 * 60, (violationCount + 1).toString()); // 24 hour expiry
        }
        
        if (err) next(err);
        else next();
      });
    } catch (error) {
      logger.error('Progressive rate limiting error:', error);
      return rateLimit(baseOptions)(req, res, next);
    }
  };
}

/**
 * IP allowlist bypass for rate limiting
 */
export function allowlistBypass(allowedIPs: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (allowedIPs.includes(req.ip || '')) {
      // Bypass rate limiting for allowed IPs
      return next();
    }
    next();
  };
}

/**
 * Get rate limit status for a key
 */
export async function getRateLimitStatus(key: string, windowMs: number): Promise<RateLimitInfo | null> {
  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const count = await redisClient.zCount(key, windowStart, '+inf');
    const resetTime = new Date(now + windowMs);
    
    return {
      totalHits: count,
      totalResets: 0,
      resetTime,
      remaining: 0
    };
  } catch (error) {
    logger.error('Error getting rate limit status:', error);
    return null;
  }
}

/**
 * Clear rate limit for a key (admin function)
 */
export async function clearRateLimit(key: string): Promise<boolean> {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Error clearing rate limit:', error);
    return false;
  }
}

export default {
  rateLimit,
  burstProtection,
  progressiveRateLimit,
  allowlistBypass,
  getRateLimitStatus,
  clearRateLimit
};
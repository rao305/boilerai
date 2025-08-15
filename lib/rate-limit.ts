// Rate limiting utilities using Redis sliding window + token bucket
import { Redis } from '@upstash/redis'
import { env } from './env'

// Initialize Redis client
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

export interface RateLimitConfig {
  interval: number // Time window in milliseconds
  tokensPerInterval: number // Number of tokens per interval
  uniqueTokenPerInterval?: number // Max unique tokens per interval
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

/**
 * Sliding window rate limiter with token bucket
 */
export function rateLimit(config: RateLimitConfig) {
  return async (identifier: string): Promise<RateLimitResult> => {
    const {
      interval,
      tokensPerInterval,
      uniqueTokenPerInterval = 500,
    } = config

    const now = Date.now()
    const windowStart = Math.floor(now / interval) * interval
    const windowEnd = windowStart + interval

    // Keys for Redis
    const windowKey = `rate_limit:${identifier}:${windowStart}`
    const globalWindowKey = `rate_limit:global:${windowStart}`

    try {
      // Multi-command transaction
      const pipeline = redis.pipeline()
      
      // Get current count for this identifier
      pipeline.get(windowKey)
      
      // Get global unique identifiers count
      pipeline.scard(globalWindowKey)
      
      const results = await pipeline.exec()
      const currentCount = (results[0] as number) || 0
      const globalCount = (results[1] as number) || 0

      // Check rate limits
      if (currentCount >= tokensPerInterval) {
        return {
          success: false,
          remaining: 0,
          resetTime: windowEnd,
        }
      }

      if (globalCount >= uniqueTokenPerInterval) {
        return {
          success: false,
          remaining: tokensPerInterval - currentCount,
          resetTime: windowEnd,
        }
      }

      // Increment counters
      const incrementPipeline = redis.pipeline()
      
      // Increment identifier counter
      incrementPipeline.incr(windowKey)
      incrementPipeline.expire(windowKey, Math.ceil(interval / 1000) + 60) // +60s buffer
      
      // Add to global set
      incrementPipeline.sadd(globalWindowKey, identifier)
      incrementPipeline.expire(globalWindowKey, Math.ceil(interval / 1000) + 60)

      await incrementPipeline.exec()

      return {
        success: true,
        remaining: tokensPerInterval - currentCount - 1,
        resetTime: windowEnd,
      }
    } catch (error) {
      console.error('Rate limit error:', error)
      // Fail open on Redis errors (allow request)
      return {
        success: true,
        remaining: tokensPerInterval - 1,
        resetTime: windowEnd,
      }
    }
  }
}

/**
 * Token bucket rate limiter for burst handling
 */
export function tokenBucketRateLimit(config: {
  maxTokens: number
  refillRate: number // tokens per second
  refillInterval: number // milliseconds
}) {
  return async (identifier: string): Promise<RateLimitResult> => {
    const { maxTokens, refillRate, refillInterval } = config
    const now = Date.now()
    const bucketKey = `token_bucket:${identifier}`

    try {
      // Get current bucket state
      const bucketData = await redis.get(bucketKey) as any
      
      let tokens = maxTokens
      let lastRefill = now

      if (bucketData) {
        const parsed = JSON.parse(bucketData)
        tokens = parsed.tokens
        lastRefill = parsed.lastRefill

        // Calculate tokens to add based on time elapsed
        const timeElapsed = now - lastRefill
        const tokensToAdd = Math.floor(timeElapsed / refillInterval) * refillRate
        tokens = Math.min(maxTokens, tokens + tokensToAdd)
      }

      // Check if we have tokens available
      if (tokens < 1) {
        return {
          success: false,
          remaining: 0,
          resetTime: lastRefill + refillInterval,
        }
      }

      // Consume a token
      tokens -= 1

      // Update bucket state
      await redis.set(
        bucketKey,
        JSON.stringify({
          tokens,
          lastRefill: now,
        }),
        { ex: Math.ceil(maxTokens / refillRate * refillInterval / 1000) + 3600 } // 1 hour buffer
      )

      return {
        success: true,
        remaining: tokens,
        resetTime: lastRefill + refillInterval,
      }
    } catch (error) {
      console.error('Token bucket error:', error)
      // Fail open on Redis errors
      return {
        success: true,
        remaining: maxTokens - 1,
        resetTime: now + refillInterval,
      }
    }
  }
}

/**
 * Combined rate limiter with multiple tiers
 */
export function tieredRateLimit(tiers: {
  name: string
  config: RateLimitConfig
}[]) {
  const limiters = tiers.map(tier => ({
    name: tier.name,
    limiter: rateLimit(tier.config),
  }))

  return async (identifier: string): Promise<RateLimitResult & { tier?: string }> => {
    for (const { name, limiter } of limiters) {
      const result = await limiter(identifier)
      if (!result.success) {
        return { ...result, tier: name }
      }
    }

    return {
      success: true,
      remaining: Number.MAX_SAFE_INTEGER,
      resetTime: Date.now() + 60000,
    }
  }
}

/**
 * Rate limit middleware for Next.js API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  getIdentifier?: (req: Request) => string
) {
  const limiter = rateLimit(config)

  return async (request: Request, identifier?: string): Promise<void> => {
    const id = identifier || 
                getIdentifier?.(request) || 
                request.headers.get('x-forwarded-for')?.split(',')[0] || 
                'anonymous'

    const result = await limiter(id)
    
    if (!result.success) {
      throw new Error('Rate limit exceeded')
    }
  }
}

/**
 * Get rate limit status without consuming tokens
 */
export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { interval, tokensPerInterval } = config
  const now = Date.now()
  const windowStart = Math.floor(now / interval) * interval
  const windowEnd = windowStart + interval
  const windowKey = `rate_limit:${identifier}:${windowStart}`

  try {
    const currentCount = await redis.get(windowKey) as number || 0
    
    return {
      success: currentCount < tokensPerInterval,
      remaining: Math.max(0, tokensPerInterval - currentCount),
      resetTime: windowEnd,
    }
  } catch (error) {
    console.error('Rate limit status error:', error)
    return {
      success: true,
      remaining: tokensPerInterval,
      resetTime: windowEnd,
    }
  }
}

/**
 * Clear rate limit for identifier (admin/testing use)
 */
export async function clearRateLimit(identifier: string): Promise<void> {
  try {
    const pattern = `rate_limit:${identifier}:*`
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Clear rate limit error:', error)
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints
  auth: {
    interval: 60 * 1000, // 1 minute
    tokensPerInterval: 5,
  },

  // Vault operations
  vault: {
    interval: 60 * 1000, // 1 minute  
    tokensPerInterval: 10,
  },

  // Signals ingestion
  signals: {
    interval: 60 * 1000, // 1 minute
    tokensPerInterval: 1, // Only 1 batch per minute
  },

  // Share example
  shareExample: {
    interval: 60 * 60 * 1000, // 1 hour
    tokensPerInterval: 3, // Max 3 examples per hour
  },

  // API calls
  api: {
    interval: 60 * 1000, // 1 minute
    tokensPerInterval: 30,
  },

  // Global limits
  global: {
    interval: 60 * 1000, // 1 minute
    tokensPerInterval: 100,
    uniqueTokenPerInterval: 1000,
  },
} as const
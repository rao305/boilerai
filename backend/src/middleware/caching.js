const { configManager } = require('../config/secrets');
const { logger } = require('../utils/logger');

/**
 * In-memory cache implementation with TTL and size limits
 * For production, consider using Redis or Memcached
 */
class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.timers = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.hitCount = 0;
    this.missCount = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      clears: 0
    };
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Generate cache key from request
   */
  generateKey(req) {
    const { method, originalUrl, user } = req;
    const userId = user?.id || 'anonymous';
    
    // Include query parameters in cache key
    const query = new URLSearchParams(req.query).toString();
    const queryStr = query ? `?${query}` : '';
    
    return `${method}:${originalUrl}${queryStr}:${userId}`;
  }

  /**
   * Set cache entry with TTL
   */
  set(key, value, ttl = null) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    const actualTTL = ttl || this.defaultTTL;
    const expiresAt = Date.now() + actualTTL;
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    // Set expiration timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const timer = setTimeout(() => {
      this.delete(key);
    }, actualTTL);

    this.timers.set(key, timer);
    this.stats.sets++;

    logger.debug('Cache set', { key, ttl: actualTTL });
  }

  /**
   * Get cache entry
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      logger.debug('Cache expired', { key });
      return null;
    }

    this.stats.hits++;
    logger.debug('Cache hit', { key, age: Date.now() - entry.createdAt });
    return entry.value;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    if (deleted) {
      this.stats.deletes++;
      logger.debug('Cache delete', { key });
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    this.stats.clears++;
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cache cleanup', { cleanedCount });
    }
  }

  /**
   * Shutdown cache (clear timers)
   */
  shutdown() {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Create cache instances for different types of data
const caches = {
  // API responses cache
  api: new MemoryCache({
    maxSize: 500,
    defaultTTL: 300000 // 5 minutes
  }),
  
  // User data cache (shorter TTL for security)
  user: new MemoryCache({
    maxSize: 200,
    defaultTTL: 60000 // 1 minute
  }),
  
  // Static data cache (longer TTL)
  static: new MemoryCache({
    maxSize: 100,
    defaultTTL: 1800000 // 30 minutes
  }),
  
  // Course data cache
  courses: new MemoryCache({
    maxSize: 300,
    defaultTTL: 600000 // 10 minutes
  })
};

/**
 * Cache middleware factory
 */
const createCacheMiddleware = (options = {}) => {
  const {
    cacheType = 'api',
    ttl = null,
    keyGenerator = null,
    condition = null,
    invalidateOn = []
  } = options;

  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if condition fails
    if (condition && !condition(req, res)) {
      return next();
    }

    const cache = caches[cacheType];
    const cacheKey = keyGenerator ? keyGenerator(req) : cache.generateKey(req);
    
    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      return res.json(cached);
    }

    // Cache miss - intercept response
    res.set('X-Cache', 'MISS');
    res.set('X-Cache-Key', cacheKey);

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttl);
        logger.debug('Response cached', { 
          cacheKey, 
          statusCode: res.statusCode,
          cacheType 
        });
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Cache invalidation middleware
 */
const createInvalidationMiddleware = (options = {}) => {
  const {
    patterns = [],
    cacheTypes = ['api'],
    condition = null
  } = options;

  return (req, res, next) => {
    // Skip if condition fails
    if (condition && !condition(req, res)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json;
    const originalSend = res.send;

    const invalidateCache = () => {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheTypes.forEach(cacheType => {
          const cache = caches[cacheType];
          
          if (patterns.length === 0) {
            // Clear all cache if no patterns specified
            cache.clear();
          } else {
            // Clear cache entries matching patterns
            for (const [key] of cache.cache.entries()) {
              if (patterns.some(pattern => {
                if (typeof pattern === 'string') {
                  return key.includes(pattern);
                } else if (pattern instanceof RegExp) {
                  return pattern.test(key);
                }
                return false;
              })) {
                cache.delete(key);
              }
            }
          }
        });

        logger.debug('Cache invalidated', { 
          patterns, 
          cacheTypes,
          url: req.originalUrl,
          method: req.method
        });
      }
    };

    // Override response methods
    res.json = function(data) {
      invalidateCache();
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      invalidateCache();
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Predefined cache middleware for common use cases
 */
const cacheMiddleware = {
  // Cache API responses for 5 minutes
  api: createCacheMiddleware({
    cacheType: 'api',
    ttl: 300000
  }),

  // Cache user data for 1 minute
  user: createCacheMiddleware({
    cacheType: 'user',
    ttl: 60000,
    condition: (req) => req.user?.id // Only cache if user is authenticated
  }),

  // Cache static data for 30 minutes
  static: createCacheMiddleware({
    cacheType: 'static',
    ttl: 1800000
  }),

  // Cache course data for 10 minutes
  courses: createCacheMiddleware({
    cacheType: 'courses',
    ttl: 600000
  }),

  // Short-term cache for expensive operations (1 minute)
  shortTerm: createCacheMiddleware({
    cacheType: 'api',
    ttl: 60000
  })
};

/**
 * Cache invalidation middleware for different data types
 */
const invalidateMiddleware = {
  // Invalidate user-related cache
  user: createInvalidationMiddleware({
    patterns: ['/api/auth', '/api/user'],
    cacheTypes: ['user', 'api']
  }),

  // Invalidate course-related cache
  courses: createInvalidationMiddleware({
    patterns: ['/api/courses', '/api/planner'],
    cacheTypes: ['courses', 'api']
  }),

  // Invalidate all cache
  all: createInvalidationMiddleware({
    patterns: [],
    cacheTypes: ['api', 'user', 'static', 'courses']
  })
};

/**
 * Cache statistics endpoint middleware
 */
const cacheStatsMiddleware = (req, res) => {
  const stats = {};
  
  Object.keys(caches).forEach(cacheType => {
    stats[cacheType] = caches[cacheType].getStats();
  });

  res.json({
    cacheStats: stats,
    timestamp: new Date().toISOString()
  });
};

/**
 * Graceful shutdown
 */
const shutdownCaches = () => {
  Object.values(caches).forEach(cache => {
    cache.shutdown();
  });
  logger.info('All caches shut down');
};

// Handle process termination
process.on('SIGTERM', shutdownCaches);
process.on('SIGINT', shutdownCaches);

module.exports = {
  MemoryCache,
  caches,
  createCacheMiddleware,
  createInvalidationMiddleware,
  cacheMiddleware,
  invalidateMiddleware,
  cacheStatsMiddleware,
  shutdownCaches
};
import { createClient, RedisClientType } from 'redis';
import { env } from './env';
import logger from '../utils/logger';

// Redis client configuration
const redisClient: RedisClientType = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('❌ Redis connection failed after 10 retries');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 50, 2000);
    }
  }
});

// Connection event handlers
redisClient.on('connect', () => {
  logger.info('🔗 Redis client connecting...');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis client connected and ready');
});

redisClient.on('error', (error) => {
  logger.error('❌ Redis client error:', error);
});

redisClient.on('end', () => {
  logger.info('Redis client connection ended');
});

// Initialize Redis connection
export async function connectRedis(): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// Redis health check
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redisClient.ping();
    logger.info('✅ Redis connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis disconnected gracefully');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
}

export { redisClient };
export default redisClient;
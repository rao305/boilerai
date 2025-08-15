import express from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectRedis, redisClient } from './config/redis';
import { checkDatabaseConnection } from './config/database';
import { initializeEmailService } from './services/emailService';
import { cleanupExpiredMagicLinks } from './services/magicLinkService';
import { cleanupOldAuditLogs } from './services/auditService';
import passport from './config/passport';
import logger from './utils/logger';

// Import middleware
import { 
  securityHeaders, 
  requestLogger, 
  errorLogger, 
  configureTrustedProxies, 
  requestSizeLimits,
  validateSecurityHeaders,
  noCache 
} from './middleware/security';
import { authErrorHandler } from './middleware/auth';
import { rateLimit, burstProtection } from './middleware/rateLimit';

// Import routes
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';
import dashboardRoutes from './routes/dashboard';
import magicLinkRoutes from './routes/magicLink';

// Create Express app
const app = express();

// Configure trusted proxies
configureTrustedProxies(app);

// Security middleware (apply early)
app.use(securityHeaders);
app.use(requestLogger);

// CORS configuration
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Body parsing middleware
app.use(express.json(requestSizeLimits.json));
app.use(express.urlencoded(requestSizeLimits.urlencoded));
app.use(cookieParser());

// Security validation
app.use(validateSecurityHeaders);

// Global rate limiting and burst protection
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  skipSuccessfulRequests: false
}));

app.use(burstProtection(20, 5, 1000)); // 20 tokens, refill 5 per second

// Session configuration
const redisStore = new RedisStore({ client: redisClient as any, prefix: 'sess:' });

app.use(session({
  store: redisStore,
  secret: env.SESSION_SECRET,
  name: '__Secure-auth.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const healthy = dbHealthy && redisClient.isOpen;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      redis: redisClient.isOpen ? 'healthy' : 'unhealthy'
    }
  });
});

// Mount routes
app.use('/', dashboardRoutes);
app.use('/auth', authRoutes);
app.use('/auth', magicLinkRoutes);
app.use('/api', apiRoutes);

// Static files (serve with caching headers for non-sensitive content)
app.use('/static', express.static('public', {
  maxAge: '1h',
  etag: true,
  lastModified: true
}));

// 404 handler
app.use((req, res) => {
  logger.warn('404 Not Found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Error handling middleware
app.use(errorLogger);
app.use(authErrorHandler);

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Don't leak error details in production
  const message = env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(500).json({
    error: 'Internal Server Error',
    message
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }

    // Initialize email service (if enabled)
    if (env.FALLBACK_MAGIC_LINK) {
      await initializeEmailService();
    }

    // Start cleanup jobs
    startCleanupJobs();

    // Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Purdue Auth Service running on port ${env.PORT}`);
      logger.info(`📊 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
      logger.info(`🔐 Sign in: http://localhost:${env.PORT}/auth/signin`);
      
      if (env.FALLBACK_MAGIC_LINK) {
        logger.info('📧 Magic link fallback: ENABLED');
      } else {
        logger.info('📧 Magic link fallback: DISABLED');
      }
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Cleanup jobs
function startCleanupJobs() {
  // Clean up expired magic links every hour
  if (env.FALLBACK_MAGIC_LINK) {
    setInterval(async () => {
      try {
        await cleanupExpiredMagicLinks();
      } catch (error) {
        logger.error('Cleanup job error (magic links):', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  // Clean up old audit logs daily
  if (env.ENABLE_AUDIT_LOGS) {
    setInterval(async () => {
      try {
        await cleanupOldAuditLogs(90); // Keep 90 days
      } catch (error) {
        logger.error('Cleanup job error (audit logs):', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}

// Graceful shutdown
async function gracefulShutdown(server: any) {
  logger.info('Received shutdown signal, starting graceful shutdown...');
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      const { disconnectDatabase } = await import('./config/database');
      await disconnectDatabase();
      
      // Close Redis connection
      const { disconnectRedis } = await import('./config/redis');
      await disconnectRedis();
      
      logger.info('All connections closed, exiting process');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;
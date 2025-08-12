const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { connectDB, dbManager } = require('./config/database');
const User = require('./models/User');
const adminRoutes = require('./routes/admin');
const { configManager } = require('./config/secrets');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { cacheStatsMiddleware } = require('./middleware/caching');
require('dotenv').config();

// Validate environment configuration
try {
  configManager.validateEnvironment();
  logger.info('🔧 Configuration validated successfully');
} catch (error) {
  logger.error('❌ Configuration Error', { error: error.message });
  if (configManager.isProduction()) {
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize database connection
connectDB();

// Function to create/verify test user on server startup
async function ensureTestUser() {
  // Only create test user if enabled in configuration
  if (!configManager.get('testUser.enabled')) {
    return;
  }

  try {
    const testEmail = configManager.get('testUser.email');
    const testPassword = configManager.get('testUser.password');
    
    // Check if test user already exists
    let testUser = await User.findOne({ email: testEmail });
    
    if (testUser) {
      // Ensure the existing user is verified and has correct password
      testUser.emailVerified = true;
      testUser.emailVerificationToken = undefined;
      testUser.emailVerificationExpires = undefined;
      testUser.lastLogin = new Date();
      
      // Update password if needed (will be hashed by pre-save hook)
      testUser.hashedPassword = testPassword;
      await testUser.save();
      
      logger.info(`✅ Test user verified and updated`, { email: testEmail });
    } else {
      // Create new test user
      testUser = new User({
        email: testEmail,
        name: 'Test Developer',
        classStatus: 'senior',
        major: 'Computer Science',
        hashedPassword: testPassword, // Will be hashed by pre-save hook
        emailVerified: true, // Already verified for dev
        transcriptData: null,
        academicPlan: null,
        preferences: {
          theme: 'system',
          notifications: true
        },
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await testUser.save();
      logger.info(`✅ Created test user`, { email: testEmail });
    }
    
    if (configManager.isDevelopment()) {
      logger.info('🔑 Development Test Credentials Available', {
        email: testEmail,
        passwordLocation: '.env file (TEST_USER_PASSWORD)',
        emailVerification: 'NOT REQUIRED (auto-verified)'
      });
    }
    
  } catch (error) {
    logger.error('❌ Error creating test user', { error: error.message });
  }
}

// Create test user after database connection (development only)
if (process.env.NODE_ENV !== 'production') {
  setTimeout(ensureTestUser, 1000); // Wait 1 second for DB connection
}

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Enhanced CORS configuration with secure origin handling
const allowedOrigins = configManager.getAllowedOrigins();

// Add default development origins if in development
if (configManager.isDevelopment()) {
  allowedOrigins.push(
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173', // Vite default port
    'http://127.0.0.1:3000'
  );
}

app.use(cors({
  origin: (origin, callback) => {
    // In production, be strict about origins
    if (configManager.isProduction()) {
      if (!origin) {
        // Block requests with no origin in production
        return callback(new Error('Origin header required'), false);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        logger.security('CORS_BLOCKED', { origin, environment: 'production' });
        return callback(new Error('Not allowed by CORS'), false);
      }
    }
    
    // In development, be more permissive but still validate
    if (!origin) {
      return callback(null, true); // Allow no origin in development
    }
    
    // Check against allowed origins first
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow localhost/127.0.0.1 with any port
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin);
    if (isLocalhost) {
      return callback(null, true);
    }
    
    logger.security('CORS_BLOCKED', { origin, environment: 'development' });
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID'],
  maxAge: configManager.isProduction() ? 86400 : 300 // 24h in prod, 5min in dev
}));

// Import input sanitization middleware
const { sanitizeRequest } = require('./middleware/inputSanitization');

// Request logging middleware
app.use(requestLogger);

// Morgan HTTP logging (only in development, we use our logger in production)
if (configManager.isDevelopment()) {
  app.use(morgan('dev'));
}

// Request body parsing with security limits
app.use(express.json({ 
  limit: configManager.get('rateLimit.jsonLimit', '10mb'),
  type: 'application/json',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: configManager.get('rateLimit.jsonLimit', '10mb'),
  parameterLimit: 100 // Limit number of parameters
}));

// Global input sanitization
app.use(sanitizeRequest({
  body: true,
  query: true,
  params: true,
  maxDepth: 5
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/api/transcript', require('./routes/transcript'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/planner', require('./routes/planner'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));

// Admin routes for email configuration
app.use('/api/admin', adminRoutes);

// Health check with comprehensive system information
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await dbManager.healthCheck()
  };

  // Include cache stats in development or for admin users
  if (configManager.isDevelopment() || req.user?.role === 'admin') {
    health.performance = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };
  }

  const statusCode = health.database.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Cache statistics endpoint (development only)
if (configManager.isDevelopment()) {
  app.get('/api/health/cache', cacheStatsMiddleware);
}

// Error handling middleware
app.use(require('./middleware/errorHandler'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error logging middleware
app.use(errorLogger);

app.listen(PORT, () => {
  logger.info('🚀 Backend server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `http://localhost:${PORT}/api/health`,
    timestamp: new Date().toISOString()
  });
}); 
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

// JWT secret (REQUIRED in production)
const JWT_SECRET = process.env.JWT_SECRET;

// Validate JWT secret exists in production
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

// Development fallback (only for development)
const DEVELOPMENT_JWT_SECRET = 'development-only-jwt-secret-not-for-production';
const jwtSecret = process.env.NODE_ENV === 'production' ? JWT_SECRET : (JWT_SECRET || DEVELOPMENT_JWT_SECRET);

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Development bypass for dev tokens
    if (token.startsWith('dev-token-bypass-') && process.env.NODE_ENV === 'development') {
      console.log('🔧 Development token detected, bypassing authentication');
      req.user = {
        id: 'dev-user-123',
        email: 'dev@purdue.edu',
        name: 'Development User'
      };
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    // Add user info to request object with security logging
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name
    };

    // Security logging for authentication events
    logger.info('User authenticated', {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 200),
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Development bypass for dev tokens
      if (token.startsWith('dev-token-bypass-') && process.env.NODE_ENV === 'development') {
        req.user = {
          id: 'dev-user-123',
          email: 'dev@purdue.edu',
          name: 'Development User'
        };
      } else {
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          req.user = {
            id: user._id,
            email: user.email,
            name: user.name
          };
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if token verification fails
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
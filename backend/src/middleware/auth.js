const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    // Add user info to request object
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name
    };

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
        const decoded = jwt.verify(token, JWT_SECRET);
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
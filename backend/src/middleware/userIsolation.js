const { logger } = require('../utils/logger');

/**
 * CRITICAL SECURITY MIDDLEWARE: User Data Isolation
 * Prevents cross-user data access by enforcing user-scoped queries
 * FERPA COMPLIANCE: Ensures users can only access their own educational records
 */

/**
 * Middleware to enforce user data isolation in all database queries
 * Adds user ID filter to prevent cross-user data access
 */
const enforceUserIsolation = (req, res, next) => {
  try {
    // Skip isolation for non-authenticated routes
    if (!req.user || !req.user.id) {
      return next();
    }

    // Add user filter that MUST be included in all database queries
    req.userFilter = { 
      userId: req.user.id.toString() 
    };

    // Add helper method to safely query user-specific data
    req.getUserQuery = (additionalFilters = {}) => {
      return {
        ...req.userFilter,
        ...additionalFilters
      };
    };

    // Security logging for data access
    logger.info('User data access enforced', {
      userId: req.user.id,
      email: req.user.email,
      route: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    logger.error('User isolation enforcement failed', {
      error: error.message,
      userId: req.user?.id,
      route: req.path,
      method: req.method
    });
    
    return res.status(500).json({
      success: false,
      message: 'Security validation failed'
    });
  }
};

/**
 * Validate that a database query includes proper user isolation
 * SECURITY CRITICAL: Prevents accidental cross-user data exposure
 */
const validateUserQuery = (query, userId) => {
  if (!query || typeof query !== 'object') {
    throw new Error('Invalid query object');
  }

  if (!userId) {
    throw new Error('User ID required for data isolation');
  }

  // Ensure user filter is present in query
  if (!query.userId || query.userId.toString() !== userId.toString()) {
    throw new Error('User isolation filter missing from query');
  }

  return true;
};

/**
 * Wrapper for database queries that enforces user isolation
 * Use this for all user-specific database operations
 */
const createUserQuery = (userId, additionalFilters = {}) => {
  if (!userId) {
    throw new Error('User ID required for secure database query');
  }

  return {
    userId: userId.toString(),
    ...additionalFilters
  };
};

/**
 * Middleware to prevent access to other users' data in route parameters
 * Validates that URL parameters don't contain other user IDs
 */
const validateUserParams = (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // If route contains userId parameter, ensure it matches authenticated user
    if (userId && req.user && userId !== req.user.id.toString()) {
      logger.security('UNAUTHORIZED_USER_ACCESS_ATTEMPT', {
        authenticatedUserId: req.user.id,
        requestedUserId: userId,
        route: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 200)
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other user data'
      });
    }

    next();
  } catch (error) {
    logger.error('User parameter validation failed', {
      error: error.message,
      params: req.params,
      userId: req.user?.id
    });
    
    return res.status(500).json({
      success: false,
      message: 'Security validation failed'
    });
  }
};

/**
 * Sanitize response data to ensure no cross-user data leakage
 * Removes any data that doesn't belong to the authenticated user
 */
const sanitizeUserResponse = (data, userId) => {
  if (!data) return data;
  
  // If data is an array, filter to only include user's data
  if (Array.isArray(data)) {
    return data.filter(item => 
      item.userId && item.userId.toString() === userId.toString()
    );
  }
  
  // If data is an object, verify it belongs to the user
  if (typeof data === 'object' && data.userId) {
    if (data.userId.toString() !== userId.toString()) {
      logger.security('DATA_SANITIZATION_BLOCKED_CROSS_USER_ACCESS', {
        userId: userId,
        dataUserId: data.userId,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }
  
  return data;
};

module.exports = {
  enforceUserIsolation,
  validateUserQuery,
  createUserQuery,
  validateUserParams,
  sanitizeUserResponse
};
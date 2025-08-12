const validator = require('validator');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Input sanitization and validation middleware
 * Protects against XSS, SQL injection, and other input-based attacks
 */

/**
 * Custom sanitization functions
 */
const sanitizers = {
  /**
   * Sanitize string input to prevent XSS
   */
  sanitizeString: (value) => {
    if (typeof value !== 'string') return value;
    
    // Remove null bytes and control characters
    value = value.replace(/\0/g, '');
    value = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Escape HTML entities
    value = validator.escape(value);
    
    // Trim whitespace
    value = value.trim();
    
    return value;
  },

  /**
   * Sanitize email input
   */
  sanitizeEmail: (value) => {
    if (typeof value !== 'string') return value;
    
    // Normalize and validate email
    value = validator.normalizeEmail(value, {
      gmail_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      gmail_convert_googlemaildotcom: true,
      outlookdotcom_lowercase: true,
      outlookdotcom_remove_subaddress: false,
      yahoo_lowercase: true,
      yahoo_remove_subaddress: false,
      icloud_lowercase: true,
      icloud_remove_subaddress: false
    });
    
    return value;
  },

  /**
   * Sanitize numeric input
   */
  sanitizeNumeric: (value) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;
    
    // Remove non-numeric characters except decimal point and minus
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  },

  /**
   * Sanitize boolean input
   */
  sanitizeBoolean: (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return false;
    
    const lower = value.toLowerCase().trim();
    return ['true', '1', 'yes', 'on'].includes(lower);
  },

  /**
   * Sanitize array input
   */
  sanitizeArray: (value, itemSanitizer = sanitizers.sanitizeString) => {
    if (!Array.isArray(value)) return [];
    
    return value
      .filter(item => item != null)
      .map(item => itemSanitizer(item))
      .filter(item => item != null);
  },

  /**
   * Sanitize object keys and values
   */
  sanitizeObject: (obj, allowedKeys = []) => {
    if (typeof obj !== 'object' || obj === null) return {};
    
    const sanitized = {};
    
    Object.keys(obj).forEach(key => {
      // Only allow whitelisted keys
      if (allowedKeys.length > 0 && !allowedKeys.includes(key)) {
        return;
      }
      
      // Sanitize key name
      const sanitizedKey = sanitizers.sanitizeString(key);
      if (!sanitizedKey) return;
      
      // Sanitize value based on type
      let value = obj[key];
      if (typeof value === 'string') {
        value = sanitizers.sanitizeString(value);
      } else if (Array.isArray(value)) {
        value = sanitizers.sanitizeArray(value);
      } else if (typeof value === 'object' && value !== null) {
        value = sanitizers.sanitizeObject(value, allowedKeys);
      }
      
      sanitized[sanitizedKey] = value;
    });
    
    return sanitized;
  }
};

/**
 * Common validation rules
 */
const validationRules = {
  /**
   * Email validation
   */
  email: () => [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail()
      .customSanitizer(sanitizers.sanitizeEmail)
      .isLength({ max: 254 })
      .withMessage('Email must be less than 254 characters')
  ],

  /**
   * Password validation
   */
  password: (field = 'password') => [
    body(field)
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
  ],

  /**
   * Name validation
   */
  name: (field = 'name') => [
    body(field)
      .trim()
      .customSanitizer(sanitizers.sanitizeString)
      .isLength({ min: 1, max: 100 })
      .withMessage(`${field} must be between 1 and 100 characters`)
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage(`${field} can only contain letters, spaces, hyphens, apostrophes, and periods`)
  ],

  /**
   * MongoDB ObjectId validation
   */
  objectId: (field) => [
    param(field)
      .trim()
      .isMongoId()
      .withMessage(`${field} must be a valid ObjectId`)
  ],

  /**
   * Generic string validation
   */
  string: (field, options = {}) => {
    const { min = 1, max = 1000, pattern, required = true } = options;
    
    let validation = body(field).trim().customSanitizer(sanitizers.sanitizeString);
    
    if (required) {
      validation = validation.notEmpty().withMessage(`${field} is required`);
    } else {
      validation = validation.optional();
    }
    
    validation = validation
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`);
    
    if (pattern) {
      validation = validation
        .matches(pattern)
        .withMessage(`${field} format is invalid`);
    }
    
    return [validation];
  },

  /**
   * Numeric validation
   */
  numeric: (field, options = {}) => {
    const { min, max, integer = false } = options;
    
    let validation = body(field)
      .customSanitizer(sanitizers.sanitizeNumeric);
    
    if (integer) {
      validation = validation.isInt();
    } else {
      validation = validation.isNumeric();
    }
    
    if (min !== undefined) {
      validation = validation.isFloat({ min });
    }
    
    if (max !== undefined) {
      validation = validation.isFloat({ max });
    }
    
    return [validation];
  },

  /**
   * Array validation
   */
  array: (field, options = {}) => {
    const { maxLength = 100, itemValidator } = options;
    
    let validation = body(field)
      .isArray({ max: maxLength })
      .withMessage(`${field} must be an array with maximum ${maxLength} items`);
    
    if (itemValidator) {
      validation = validation.custom((arr) => {
        return arr.every(item => itemValidator(item));
      }).withMessage(`${field} contains invalid items`);
    }
    
    return [validation];
  }
};

/**
 * Middleware to check validation results
 */
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errorMessages
    });
  }
  
  next();
};

/**
 * Request sanitization middleware
 */
const sanitizeRequest = (options = {}) => {
  const { 
    body: sanitizeBody = true,
    query: sanitizeQuery = true,
    params: sanitizeParams = true,
    allowedBodyKeys = [],
    allowedQueryKeys = [],
    maxDepth = 5
  } = options;
  
  return (req, res, next) => {
    try {
      // Prevent prototype pollution
      if (req.body && typeof req.body === 'object') {
        delete req.body.__proto__;
        delete req.body.constructor;
        delete req.body.prototype;
      }
      
      // Sanitize request body
      if (sanitizeBody && req.body) {
        if (Array.isArray(req.body)) {
          req.body = sanitizers.sanitizeArray(req.body);
        } else if (typeof req.body === 'object') {
          req.body = sanitizers.sanitizeObject(req.body, allowedBodyKeys);
        }
      }
      
      // Sanitize query parameters
      if (sanitizeQuery && req.query) {
        req.query = sanitizers.sanitizeObject(req.query, allowedQueryKeys);
      }
      
      // Sanitize route parameters
      if (sanitizeParams && req.params) {
        Object.keys(req.params).forEach(key => {
          req.params[key] = sanitizers.sanitizeString(req.params[key]);
        });
      }
      
      next();
    } catch (error) {
      console.error('❌ Request sanitization error:', error);
      res.status(400).json({
        error: 'Invalid request format'
      });
    }
  };
};

/**
 * Rate limiting per field middleware
 */
const fieldRateLimit = (field, limit = 5, windowMs = 60000) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const fieldValue = req.body[field] || req.query[field];
    if (!fieldValue) return next();
    
    const now = Date.now();
    const key = `${field}:${fieldValue}`;
    
    if (!attempts.has(key)) {
      attempts.set(key, []);
    }
    
    const fieldAttempts = attempts.get(key);
    
    // Remove old attempts
    const recent = fieldAttempts.filter(time => now - time < windowMs);
    attempts.set(key, recent);
    
    if (recent.length >= limit) {
      return res.status(429).json({
        error: `Too many attempts for ${field}. Please try again later.`
      });
    }
    
    recent.push(now);
    next();
  };
};

/**
 * Common validation chains for different endpoints
 */
const validationChains = {
  // User authentication
  login: [
    ...validationRules.email(),
    body('password').notEmpty().withMessage('Password is required'),
    checkValidationResult
  ],
  
  register: [
    ...validationRules.email(),
    ...validationRules.password(),
    ...validationRules.name(),
    body('classStatus')
      .trim()
      .isIn(['freshman', 'sophomore', 'junior', 'senior', 'graduate'])
      .withMessage('Class status must be freshman, sophomore, junior, senior, or graduate'),
    body('major')
      .trim()
      .customSanitizer(sanitizers.sanitizeString)
      .isLength({ min: 1, max: 100 })
      .withMessage('Major is required and must be less than 100 characters'),
    checkValidationResult
  ],
  
  // Profile updates
  updateProfile: [
    ...validationRules.name().map(rule => rule.optional()),
    body('classStatus')
      .optional()
      .trim()
      .isIn(['freshman', 'sophomore', 'junior', 'senior', 'graduate'])
      .withMessage('Class status must be freshman, sophomore, junior, senior, or graduate'),
    body('major')
      .optional()
      .trim()
      .customSanitizer(sanitizers.sanitizeString)
      .isLength({ min: 1, max: 100 })
      .withMessage('Major must be less than 100 characters'),
    checkValidationResult
  ],
  
  // Course operations
  courseData: [
    body('courseCode')
      .trim()
      .customSanitizer(sanitizers.sanitizeString)
      .matches(/^[A-Z]{2,4}\s?\d{3}[A-Z]?$/i)
      .withMessage('Course code must be in format like CS 180 or MATH 161'),
    body('courseName')
      .trim()
      .customSanitizer(sanitizers.sanitizeString)
      .isLength({ min: 1, max: 200 })
      .withMessage('Course name is required and must be less than 200 characters'),
    body('credits')
      .customSanitizer(sanitizers.sanitizeNumeric)
      .isFloat({ min: 0, max: 20 })
      .withMessage('Credits must be between 0 and 20'),
    body('semester')
      .optional()
      .trim()
      .matches(/^(Fall|Spring|Summer)\s\d{4}$/)
      .withMessage('Semester must be in format like "Fall 2024"'),
    checkValidationResult
  ]
};

module.exports = {
  sanitizers,
  validationRules,
  validationChains,
  checkValidationResult,
  sanitizeRequest,
  fieldRateLimit
};
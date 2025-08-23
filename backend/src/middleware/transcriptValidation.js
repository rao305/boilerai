const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

/**
 * Rate limiting for transcript operations
 */
const transcriptRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 transcript operations per windowMs
  message: {
    success: false,
    error: 'Too many transcript operations. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    return req.user?.id || req.ip;
  }
});

/**
 * Rate limiting for AI chat with transcript context
 */
const transcriptChatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute with transcript context
  message: {
    success: false,
    error: 'Too many AI requests with transcript context. Please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

/**
 * Validation rules for transcript data
 */
const transcriptDataValidation = [
  body('transcriptData')
    .exists()
    .withMessage('Transcript data is required')
    .isObject()
    .withMessage('Transcript data must be an object'),
    
  body('transcriptData.studentInfo')
    .optional()
    .isObject()
    .withMessage('Student info must be an object'),
    
  body('transcriptData.studentInfo.name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Student name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('Student name contains invalid characters'),
    
  body('transcriptData.studentInfo.studentId')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('Student ID must be between 5 and 20 characters')
    .matches(/^[a-zA-Z0-9\-]+$/)
    .withMessage('Student ID contains invalid characters'),
    
  body('transcriptData.gpaSummary.cumulativeGPA')
    .optional()
    .isFloat({ min: 0, max: 4.3 })
    .withMessage('GPA must be between 0 and 4.3'),
    
  body('transcriptData.completedCourses')
    .optional()
    .isObject()
    .withMessage('Completed courses must be an object'),
    
  // Validate that we don't have too many courses (prevent DoS)
  body('transcriptData')
    .custom((value) => {
      if (value.completedCourses) {
        let totalCourses = 0;
        Object.values(value.completedCourses).forEach(semester => {
          if (semester.courses && Array.isArray(semester.courses)) {
            totalCourses += semester.courses.length;
          }
        });
        
        if (totalCourses > 200) {
          throw new Error('Too many courses in transcript. Maximum 200 courses allowed.');
        }
      }
      return true;
    })
];

/**
 * Validation for chat messages
 */
const chatMessageValidation = [
  body('message')
    .exists()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
    .trim(),
    
  body('provider')
    .optional()
    .isIn(['gemini', 'openai'])
    .withMessage('Provider must be either gemini or openai'),
    
  body('includeContext')
    .optional()
    .isBoolean()
    .withMessage('includeContext must be a boolean')
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Privacy protection middleware
 */
const privacyProtection = (req, res, next) => {
  // Add privacy headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove sensitive headers from response
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * Data sanitization middleware
 */
const sanitizeTranscriptData = (req, res, next) => {
  if (req.body.transcriptData) {
    const data = req.body.transcriptData;
    
    // Remove potentially sensitive fields that shouldn't be stored
    delete data.ssn;
    delete data.socialSecurityNumber;
    delete data.birthDate;
    delete data.homeAddress;
    delete data.phoneNumber;
    delete data.emergencyContact;
    delete data.parentInfo;
    delete data.financialInfo;
    delete data.medicalInfo;
    
    // Sanitize student info
    if (data.studentInfo) {
      // Remove sensitive personal data
      delete data.studentInfo.ssn;
      delete data.studentInfo.birthDate;
      delete data.studentInfo.address;
      delete data.studentInfo.phone;
      delete data.studentInfo.email; // We already have user email from auth
      
      // Sanitize name (remove extra spaces, limit length)
      if (data.studentInfo.name) {
        data.studentInfo.name = data.studentInfo.name
          .toString()
          .trim()
          .replace(/\s+/g, ' ')
          .substring(0, 100);
      }
      
      // Sanitize student ID
      if (data.studentInfo.studentId) {
        data.studentInfo.studentId = data.studentInfo.studentId
          .toString()
          .trim()
          .substring(0, 20);
      }
    }
    
    // Sanitize course data
    if (data.completedCourses) {
      Object.keys(data.completedCourses).forEach(semesterKey => {
        const semester = data.completedCourses[semesterKey];
        if (semester.courses && Array.isArray(semester.courses)) {
          semester.courses = semester.courses.map(course => ({
            course_code: course.course_code ? course.course_code.toString().trim().substring(0, 20) : '',
            course_name: course.course_name ? course.course_name.toString().trim().substring(0, 100) : '',
            credits: parseFloat(course.credits) || 0,
            grade: course.grade ? course.grade.toString().trim().substring(0, 10) : 'P'
          }));
        }
      });
    }
  }
  
  next();
};

/**
 * Audit logging middleware
 */
const auditLogger = (action) => {
  return (req, res, next) => {
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log(`[TRANSCRIPT_AUDIT] ${action}`, {
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
    
    // Store original response.json to capture response data
    const originalJson = res.json;
    res.json = function(data) {
      // Log the response (without sensitive data)
      console.log(`[TRANSCRIPT_AUDIT] ${action}_RESPONSE`, {
        userId,
        success: data.success,
        hasError: !!data.error,
        timestamp: new Date().toISOString()
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * FERPA compliance middleware
 */
const ferpaCompliance = (req, res, next) => {
  // Add FERPA compliance headers
  res.setHeader('X-Educational-Record', 'protected');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Log FERPA access
  if (req.user) {
    console.log('[FERPA_ACCESS]', {
      userId: req.user.id,
      action: req.path,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
  }
  
  next();
};

module.exports = {
  transcriptRateLimit,
  transcriptChatRateLimit,
  transcriptDataValidation,
  chatMessageValidation,
  handleValidationErrors,
  privacyProtection,
  sanitizeTranscriptData,
  auditLogger,
  ferpaCompliance
};
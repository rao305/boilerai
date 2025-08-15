const { configManager } = require('../config/secrets');

/**
 * Production-safe logger that removes console.log statements in production
 * and provides structured logging with different levels
 */
class Logger {
  constructor() {
    this.isProduction = configManager.isProduction();
    this.isDevelopment = configManager.isDevelopment();
    
    // Log levels: error, warn, info, debug
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Current log level (configurable via environment)
    this.currentLevel = this.levels[process.env.LOG_LEVEL] ?? 
      (this.isProduction ? this.levels.warn : this.levels.debug);
  }

  /**
   * Format log message with timestamp and context
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logContext = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context
    };

    if (this.isProduction) {
      // In production, output structured JSON logs
      return JSON.stringify(logContext);
    } else {
      // In development, output readable format
      const contextStr = Object.keys(context).length > 0 
        ? ` | ${JSON.stringify(context)}` 
        : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    }
  }

  /**
   * Check if a log level should be output
   */
  shouldLog(level) {
    return this.levels[level] <= this.currentLevel;
  }

  /**
   * Error logging - always enabled
   */
  error(message, context = {}) {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, context);
      console.error(formatted);
    }
  }

  /**
   * Warning logging
   */
  warn(message, context = {}) {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, context);
      console.warn(formatted);
    }
  }

  /**
   * Info logging
   */
  info(message, context = {}) {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, context);
      console.info(formatted);
    }
  }

  /**
   * Debug logging - only in development
   */
  debug(message, context = {}) {
    if (this.shouldLog('debug') && !this.isProduction) {
      const formatted = this.formatMessage('debug', message, context);
      console.log(formatted);
    }
  }

  /**
   * HTTP request logging
   */
  http(req, res, duration) {
    const logContext = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    // Only log detailed request info in development
    if (this.isDevelopment) {
      logContext.headers = req.headers;
      logContext.body = req.body;
    }

    if (res.statusCode >= 400) {
      this.error('HTTP Error', logContext);
    } else if (res.statusCode >= 300) {
      this.warn('HTTP Redirect', logContext);
    } else {
      this.info('HTTP Request', logContext);
    }
  }

  /**
   * Database operation logging
   */
  database(operation, collection, query = {}, duration = null) {
    const logContext = {
      operation,
      collection,
      duration: duration ? `${duration}ms` : undefined
    };

    // Only log query details in development
    if (this.isDevelopment) {
      logContext.query = query;
    }

    this.debug('Database Operation', logContext);
  }

  /**
   * Security event logging
   */
  security(event, details = {}) {
    this.warn('Security Event', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Performance logging
   */
  performance(operation, duration, threshold = 1000) {
    const logContext = {
      operation,
      duration: `${duration}ms`,
      threshold: `${threshold}ms`
    };

    if (duration > threshold) {
      this.warn('Slow Operation', logContext);
    } else {
      this.debug('Performance', logContext);
    }
  }

  /**
   * Authentication logging
   */
  auth(event, userId = null, details = {}) {
    this.info('Authentication', {
      event,
      userId,
      ...details
    });
  }

  /**
   * Create child logger with context
   */
  child(context = {}) {
    const childLogger = Object.create(this);
    childLogger.defaultContext = { ...this.defaultContext, ...context };
    
    // Override methods to include default context
    ['error', 'warn', 'info', 'debug'].forEach(method => {
      childLogger[method] = (message, additionalContext = {}) => {
        this[method](message, { ...childLogger.defaultContext, ...additionalContext });
      };
    });
    
    return childLogger;
  }
}

/**
 * Console replacement for production safety
 * Prevents accidental console.log statements from appearing in production
 */
const createConsoleReplacement = (logger) => {
  if (configManager.isProduction()) {
    // In production, replace console methods with logger
    return {
      log: (...args) => logger.debug(args.join(' ')),
      info: (...args) => logger.info(args.join(' ')),
      warn: (...args) => logger.warn(args.join(' ')), 
      error: (...args) => logger.error(args.join(' ')),
      debug: (...args) => logger.debug(args.join(' '))
    };
  } else {
    // In development, allow normal console usage
    return console;
  }
};

// Create singleton logger instance
const logger = new Logger();

// Create safe console replacement
const safeConsole = createConsoleReplacement(logger);

/**
 * Express middleware for request logging
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Add request ID for tracking
  req.id = req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.set('X-Request-ID', req.id);
  
  // Create request-specific logger
  req.logger = logger.child({ requestId: req.id });
  
  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req, res, duration);
  });
  
  next();
};

/**
 * Error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  const logContext = {
    error: err.message,
    stack: configManager.isDevelopment() ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    requestId: req.id
  };
  
  logger.error('Unhandled Error', logContext);
  next(err);
};

module.exports = {
  Logger,
  logger,
  safeConsole,
  requestLogger,
  errorLogger
};
/**
 * PRODUCTION SECURITY CONFIGURATION VALIDATOR
 * 
 * Validates all required environment variables and security settings
 * before allowing the application to start in production
 */

const { logger } = require('../utils/logger');

class ProductionValidator {
  constructor() {
    this.requiredVars = [
      'JWT_SECRET',
      'DATABASE_URL',
      'ENCRYPTION_KEY'
    ];
    
    this.recommendedVars = [
      'GEMINI_API_KEY',
      'MAX_FILE_SIZE',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS',
      'SESSION_TIMEOUT_MS',
      'CLEANUP_INTERVAL_MS'
    ];
  }

  /**
   * Validate production environment
   * Throws error if critical security requirements are not met
   */
  validateProduction() {
    if (process.env.NODE_ENV !== 'production') {
      return; // Only validate in production
    }

    logger.info('🔒 Starting production security validation');

    const errors = [];
    const warnings = [];

    // Check required environment variables
    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      } else {
        this.validateVariable(varName, process.env[varName], errors, warnings);
      }
    }

    // Check recommended variables
    for (const varName of this.recommendedVars) {
      if (!process.env[varName]) {
        warnings.push(`Recommended environment variable not set: ${varName}`);
      }
    }

    // Validate security configurations
    this.validateSecurityConfig(errors, warnings);

    // Report results
    if (errors.length > 0) {
      logger.error('❌ Production security validation failed', { errors });
      throw new Error(`Production deployment blocked: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      logger.warn('⚠️ Production security warnings', { warnings });
    }

    logger.info('✅ Production security validation passed');
  }

  /**
   * Validate individual environment variables
   */
  validateVariable(varName, value, errors, warnings) {
    switch (varName) {
      case 'JWT_SECRET':
        if (value.length < 32) {
          errors.push('JWT_SECRET must be at least 32 characters long');
        }
        if (value === 'your-secret-key-change-in-production') {
          errors.push('JWT_SECRET must not use default development value');
        }
        break;

      case 'ENCRYPTION_KEY':
        if (value.length < 32) {
          errors.push('ENCRYPTION_KEY must be at least 32 characters long');
        }
        break;

      case 'DATABASE_URL':
        if (value.includes('localhost') || value.includes('127.0.0.1')) {
          warnings.push('DATABASE_URL appears to be pointing to localhost');
        }
        if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
          errors.push('DATABASE_URL must be a valid MongoDB connection string');
        }
        break;
    }
  }

  /**
   * Validate security configurations
   */
  validateSecurityConfig(errors, warnings) {
    // Check NODE_ENV
    if (process.env.NODE_ENV !== 'production') {
      errors.push('NODE_ENV must be set to "production" in production');
    }

    // Check for development-only settings
    if (process.env.DEBUG === 'true') {
      warnings.push('DEBUG mode should be disabled in production');
    }

    // Validate rate limiting
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
    if (maxRequests > 1000) {
      warnings.push('RATE_LIMIT_MAX_REQUESTS seems very high for production');
    }

    // Validate file size limits
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760;
    if (maxFileSize > 50000000) { // 50MB
      warnings.push('MAX_FILE_SIZE seems very large for production');
    }
  }

  /**
   * Get default production configuration
   */
  getDefaults() {
    return {
      MAX_FILE_SIZE: '10485760', // 10MB
      RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
      RATE_LIMIT_MAX_REQUESTS: '100',
      SESSION_TIMEOUT_MS: '3600000', // 1 hour
      CLEANUP_INTERVAL_MS: '300000' // 5 minutes
    };
  }

  /**
   * Apply default values for missing optional variables
   */
  applyDefaults() {
    const defaults = this.getDefaults();
    
    for (const [key, value] of Object.entries(defaults)) {
      if (!process.env[key]) {
        process.env[key] = value;
        logger.info(`Applied default value for ${key}: ${value}`);
      }
    }
  }
}

module.exports = new ProductionValidator();
const crypto = require('crypto');

/**
 * Secure secret management utility
 * Handles encryption/decryption of sensitive data and API keys
 */
class SecretManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    
    // Use environment variable or generate a secure key
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
   * Get or create encryption key from environment
   */
  getOrCreateEncryptionKey() {
    if (process.env.ENCRYPTION_KEY) {
      return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    }
    
    // In development, warn about missing encryption key
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ No ENCRYPTION_KEY found in environment. Using temporary key for development.');
      console.warn('⚠️ Add ENCRYPTION_KEY to your .env file for persistent encryption.');
      
      // Generate a temporary key for development
      const tempKey = crypto.randomBytes(this.keyLength);
      console.log(`💡 Temporary encryption key (add to .env): ENCRYPTION_KEY=${tempKey.toString('hex')}`);
      return tempKey;
    }
    
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, { iv });
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    const { encrypted, iv, tag } = encryptedData;
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, {
      iv: Buffer.from(iv, 'hex')
    });
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Securely store API key in encrypted format
   */
  encryptAPIKey(apiKey, service) {
    if (!apiKey) return null;
    
    const encrypted = this.encrypt(apiKey);
    return {
      service,
      ...encrypted,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Retrieve and decrypt API key
   */
  decryptAPIKey(encryptedData) {
    return this.decrypt(encryptedData);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash password with salt
   */
  hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  /**
   * Verify password against hash
   */
  verifyPassword(password, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
}

/**
 * Environment-based configuration with secure defaults
 */
class ConfigManager {
  constructor() {
    this.secretManager = new SecretManager();
    this.config = this.loadConfiguration();
  }

  loadConfiguration() {
    return {
      // Database configuration
      database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/purdue-planner',
        options: {
          maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
          serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT) || 5000,
        }
      },

      // JWT configuration
      jwt: {
        secret: process.env.JWT_SECRET || this.secretManager.generateSecureToken(64),
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'purdue-academic-planner'
      },

      // Email configuration (encrypted if available)
      email: {
        service: process.env.EMAIL_SERVICE || 'outlook',
        host: process.env.EMAIL_HOST || 'smtp-mail.outlook.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },

      // API rate limiting
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        standardHeaders: true,
        legacyHeaders: false
      },

      // CORS configuration
      cors: {
        production: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
        development: [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://0.0.0.0:3000'
        ]
      },

      // Test user configuration (development only)
      testUser: {
        email: process.env.TEST_USER_EMAIL || 'testdev@purdue.edu',
        password: process.env.TEST_USER_PASSWORD || 'DevPassword2024!',
        enabled: process.env.NODE_ENV !== 'production'
      }
    };
  }

  /**
   * Get configuration value safely
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Check if we're in production environment
   */
  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if we're in development environment
   */
  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Get allowed CORS origins based on environment
   */
  getAllowedOrigins() {
    if (this.isProduction()) {
      return this.get('cors.production', []);
    }
    return this.get('cors.development', []);
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const required = [];
    const missing = [];

    if (this.isProduction()) {
      required.push(
        'MONGODB_URI',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'ALLOWED_ORIGINS'
      );
    }

    for (const envVar of required) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return true;
  }
}

// Export singleton instances
const secretManager = new SecretManager();
const configManager = new ConfigManager();

module.exports = {
  SecretManager,
  ConfigManager,
  secretManager,
  configManager
};
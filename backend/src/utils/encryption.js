const crypto = require('crypto');
const { logger } = require('./logger');

/**
 * PRODUCTION-GRADE ENCRYPTION UTILITIES
 * 
 * Provides secure encryption for sensitive data that must be stored
 * Uses AES-256-GCM for authenticated encryption
 * FERPA COMPLIANCE: Only for non-educational metadata
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Get encryption key from environment
    this.encryptionKey = this.getEncryptionKey();
  }

  /**
   * Get encryption key from environment with validation
   */
  getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY environment variable is required in production');
      }
      // Development fallback
      logger.warn('Using development encryption key - NOT FOR PRODUCTION');
      return crypto.scryptSync('development-key-not-secure', 'salt', this.keyLength);
    }

    // Validate key length
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }

    // Convert string to key
    return crypto.scryptSync(key, 'boilerai-salt', this.keyLength);
  }

  /**
   * Encrypt sensitive data
   * Returns object with encrypted data, IV, and auth tag
   */
  encrypt(plaintext) {
    try {
      if (!plaintext) {
        throw new Error('Cannot encrypt empty data');
      }

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, { iv });
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Return encrypted object
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.algorithm
      };
    } catch (error) {
      logger.error('Encryption failed', { error: error.message });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   * Requires encrypted object with data, IV, and auth tag
   */
  decrypt(encryptedObj) {
    try {
      if (!encryptedObj || !encryptedObj.encrypted || !encryptedObj.iv || !encryptedObj.tag) {
        throw new Error('Invalid encrypted data format');
      }

      // Convert hex strings back to buffers
      const iv = Buffer.from(encryptedObj.iv, 'hex');
      const tag = Buffer.from(encryptedObj.tag, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, { iv });
      decipher.setAuthTag(tag);
      
      // Decrypt data
      let decrypted = decipher.update(encryptedObj.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error: error.message });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash sensitive data for secure storage
   * One-way hash for passwords, tokens, etc.
   */
  hash(data, salt = null) {
    try {
      if (!data) {
        throw new Error('Cannot hash empty data');
      }

      // Generate random salt if not provided
      if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
      }

      // Create hash
      const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
      
      return {
        hash: hash.toString('hex'),
        salt: salt
      };
    } catch (error) {
      logger.error('Hashing failed', { error: error.message });
      throw new Error('Hashing failed');
    }
  }

  /**
   * Verify hashed data
   */
  verifyHash(data, storedHash, salt) {
    try {
      const newHash = this.hash(data, salt);
      return newHash.hash === storedHash;
    } catch (error) {
      logger.error('Hash verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Generate secure random tokens
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random passwords
   */
  generateSecurePassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      password += chars[randomIndex];
    }
    
    return password;
  }

  /**
   * Secure comparison to prevent timing attacks
   */
  secureCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Encrypt API keys for secure storage
   * SECURITY: Only for non-educational metadata
   */
  encryptApiKey(apiKey) {
    if (!apiKey) {
      return null;
    }

    return this.encrypt(apiKey);
  }

  /**
   * Decrypt API keys
   */
  decryptApiKey(encryptedApiKey) {
    if (!encryptedApiKey) {
      return null;
    }

    return this.decrypt(encryptedApiKey);
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;
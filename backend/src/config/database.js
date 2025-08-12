const mongoose = require('mongoose');
const { configManager } = require('./secrets');
const { logger } = require('../utils/logger');

/**
 * Database configuration and connection management
 */
class DatabaseManager {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
  }

  /**
   * Connect to MongoDB with optimized settings
   */
  async connect() {
    try {
      const dbConfig = configManager.get('database');
      
      // Enhanced connection options
      const connectionOptions = {
        ...dbConfig.options,
        // Connection pool settings
        maxPoolSize: dbConfig.options.maxPoolSize || 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: dbConfig.options.serverSelectionTimeoutMS || 5000,
        socketTimeoutMS: 45000,
        
        // Performance optimizations
        bufferCommands: true,
        
        // Stability improvements
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
        
        // Monitoring
        monitorCommands: !configManager.isProduction()
      };

      // Enable mongoose debugging in development
      if (configManager.isDevelopment()) {
        mongoose.set('debug', (collection, method, query, doc) => {
          logger.debug('MongoDB Query', {
            collection,
            method,
            query: JSON.stringify(query),
            doc: doc ? 'present' : 'none'
          });
        });
      }

      // Connection event handlers
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('✅ MongoDB connected successfully', {
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        });
      });

      mongoose.connection.on('error', (error) => {
        this.isConnected = false;
        logger.error('❌ MongoDB connection error', { error: error.message });
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        logger.warn('⚠️ MongoDB disconnected');
        
        // Attempt reconnection if not intentional
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });

      mongoose.connection.on('reconnected', () => {
        this.isConnected = true;
        logger.info('🔄 MongoDB reconnected');
      });

      // Connect to database
      this.connection = await mongoose.connect(dbConfig.uri, connectionOptions);
      
      // Create indexes after connection
      await this.createIndexes();
      
      return this.connection;
      
    } catch (error) {
      logger.error('❌ Database connection failed', { error: error.message });
      
      if (configManager.isProduction()) {
        process.exit(1);
      }
      
      // For development, continue without database
      logger.warn('⚠️ Continuing without database connection for development');
      return null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    
    logger.info(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`, {
      delay: this.reconnectDelay
    });
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('❌ Reconnection attempt failed', { 
          attempt: this.reconnectAttempts,
          error: error.message 
        });
      }
    }, this.reconnectDelay);
  }

  /**
   * Create database indexes for optimal performance
   */
  async createIndexes() {
    try {
      logger.info('📊 Creating database indexes...');

      // Get all registered models
      const models = mongoose.models;
      
      // Create indexes for each model
      for (const [modelName, model] of Object.entries(models)) {
        try {
          await model.createIndexes();
          logger.debug(`✅ Indexes created for ${modelName}`);
        } catch (error) {
          logger.warn(`⚠️ Failed to create indexes for ${modelName}`, { 
            error: error.message 
          });
        }
      }

      // Create custom indexes for performance optimization
      await this.createCustomIndexes();
      
      logger.info('✅ Database indexes created successfully');
      
    } catch (error) {
      logger.error('❌ Failed to create database indexes', { error: error.message });
    }
  }

  /**
   * Create custom indexes for specific use cases
   */
  async createCustomIndexes() {
    const db = mongoose.connection.db;
    
    try {
      // Users collection indexes
      if (db.collection('users')) {
        // Email lookup (unique)
        await db.collection('users').createIndex(
          { email: 1 }, 
          { unique: true, background: true }
        );
        
        // Email verification lookup
        await db.collection('users').createIndex(
          { emailVerificationToken: 1 }, 
          { sparse: true, background: true }
        );
        
        // Active users query
        await db.collection('users').createIndex(
          { isActive: 1, emailVerified: 1 }, 
          { background: true }
        );
        
        // Last login for cleanup
        await db.collection('users').createIndex(
          { lastLogin: 1 }, 
          { background: true }
        );
        
        // Major and class status for analytics
        await db.collection('users').createIndex(
          { major: 1, classStatus: 1 }, 
          { background: true }
        );
      }

      logger.debug('✅ Custom indexes created successfully');
      
    } catch (error) {
      logger.warn('⚠️ Some custom indexes failed to create', { error: error.message });
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        connected: this.isConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Graceful disconnect
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('✅ MongoDB disconnected gracefully');
    } catch (error) {
      logger.error('❌ Error during MongoDB disconnect', { error: error.message });
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

/**
 * Connect to database (legacy function for compatibility)
 */
const connectDB = async () => {
  return await dbManager.connect();
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('🔄 SIGTERM received, closing database connection...');
  await dbManager.disconnect();
});

process.on('SIGINT', async () => {
  logger.info('🔄 SIGINT received, closing database connection...');
  await dbManager.disconnect();
});

module.exports = {
  DatabaseManager,
  dbManager,
  connectDB
};
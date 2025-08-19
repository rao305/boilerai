// Migration API Routes - Data Synchronization
const express = require('express');
const router = express.Router();
const { DataMigrationService } = require('../services/dataMigrationService');
const { logger } = require('../utils/logger');

// Initialize migration service
const migrationService = new DataMigrationService();

// POST /api/migration/sync - Execute data synchronization
router.post('/sync', async (req, res) => {
  try {
    logger.info('Data migration requested via API');
    
    const result = await migrationService.migrate();
    
    res.json({
      success: true,
      message: 'Data migration completed successfully',
      details: result
    });
    
  } catch (error) {
    logger.error('Migration API error:', error);
    res.status(500).json({
      success: false,
      message: 'Data migration failed',
      error: error.message
    });
  }
});

// GET /api/migration/status - Check migration status
router.get('/status', async (req, res) => {
  try {
    const isComplete = migrationService.isMigrationComplete();
    let validation = null;
    
    if (isComplete) {
      validation = await migrationService.validateMigration();
    }
    
    res.json({
      migrationComplete: isComplete,
      validation,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Migration status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/migration/validate - Validate migrated data
router.post('/validate', async (req, res) => {
  try {
    const validation = await migrationService.validateMigration();
    
    res.json({
      success: true,
      validation
    });
    
  } catch (error) {
    logger.error('Migration validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
// Run Data Migration Script
const { DataMigrationService } = require('../services/dataMigrationService');
const { logger } = require('../utils/logger');

async function runMigration() {
  logger.info('🚀 Starting data migration process...');
  
  const migrationService = new DataMigrationService();
  
  try {
    const result = await migrationService.migrate();
    
    logger.info('✅ Migration completed successfully!');
    logger.info('📊 Migration details:', result);
    
    if (result.validation.complete) {
      logger.info('✅ Data validation passed - all majors have complete data');
    } else {
      logger.warn('⚠️ Data validation issues:', result.validation.issues);
    }
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
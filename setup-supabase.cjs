#!/usr/bin/env node

/**
 * Supabase Migration Setup Script
 * Automates the complete migration from MongoDB to Supabase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 BoilerAI Supabase Migration Setup\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkRequirements() {
  log('📋 Checking requirements...', 'blue');
  
  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    log('❌ .env file not found', 'red');
    log('Please copy .env.example to .env and configure your variables', 'yellow');
    process.exit(1);
  }
  
  // Check if Supabase credentials are set
  const envContent = fs.readFileSync('.env', 'utf8');
  if (!envContent.includes('VITE_SUPABASE_URL') || !envContent.includes('VITE_SUPABASE_ANON_KEY')) {
    log('❌ Supabase credentials not configured in .env', 'red');
    log('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env', 'yellow');
    process.exit(1);
  }
  
  log('✅ Requirements check passed', 'green');
}

function installDependencies() {
  log('\n📦 Installing dependencies...', 'blue');
  
  try {
    // Frontend dependencies
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Frontend dependencies installed', 'green');
    
    // Backend dependencies (for migration script)
    if (fs.existsSync('backend')) {
      execSync('cd backend && npm install', { stdio: 'inherit' });
      log('✅ Backend dependencies installed', 'green');
    }
  } catch (error) {
    log('❌ Failed to install dependencies', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

function createSupabaseSchema() {
  log('\n🏗️  Setting up Supabase schema...', 'blue');
  
  if (!fs.existsSync('supabase-schema.sql')) {
    log('❌ supabase-schema.sql not found', 'red');
    process.exit(1);
  }
  
  log('📄 Schema file found: supabase-schema.sql', 'green');
  log('📋 Next steps:', 'yellow');
  log('  1. Go to Supabase Dashboard > SQL Editor', 'cyan');
  log('  2. Copy and paste the contents of supabase-schema.sql', 'cyan');
  log('  3. Run the SQL script', 'cyan');
  log('  4. Return here and press Enter to continue', 'cyan');
  
  // Wait for user input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    runMigration();
  });
}

function runMigration() {
  log('\n🔄 Running data migration...', 'blue');
  
  // Check if service role key is set
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set', 'red');
    log('Get your service role key from:', 'yellow');
    log('https://app.supabase.com/project/oydzgpyctttxjjbjjtnb/settings/api', 'cyan');
    log('Then run: export SUPABASE_SERVICE_ROLE_KEY="your_key_here"', 'cyan');
    process.exit(1);
  }
  
  try {
    if (fs.existsSync('migrate-to-supabase.js')) {
      execSync('node migrate-to-supabase.js', { stdio: 'inherit' });
      log('✅ Data migration completed', 'green');
    } else {
      log('⚠️  Migration script not found, skipping data migration', 'yellow');
    }
  } catch (error) {
    log('❌ Migration failed', 'red');
    console.error(error.message);
    log('You can run the migration manually later with:', 'yellow');
    log('node migrate-to-supabase.js', 'cyan');
  }
}

function startApplication() {
  log('\n🚀 Starting application...', 'blue');
  
  log('🎉 Migration setup complete!', 'green');
  log('\nYour BoilerAI application is now powered by Supabase:', 'bright');
  log('  ✅ PostgreSQL database with automatic scaling', 'green');
  log('  ✅ Built-in authentication and user management', 'green');
  log('  ✅ File storage with global CDN', 'green');
  log('  ✅ Real-time subscriptions', 'green');
  log('  ✅ Row-level security policies', 'green');
  log('  ✅ Automatic API generation', 'green');
  
  log('\n📚 What to do next:', 'yellow');
  log('  1. Test user registration and login', 'cyan');
  log('  2. Upload a transcript to test file storage', 'cyan');
  log('  3. Create an academic plan to test database operations', 'cyan');
  log('  4. Monitor usage in Supabase Dashboard', 'cyan');
  
  log('\n🔗 Useful links:', 'yellow');
  log('  📊 Supabase Dashboard: https://app.supabase.com/project/oydzgpyctttxjjbjjtnb', 'cyan');
  log('  📖 Migration Guide: ./SUPABASE_MIGRATION_GUIDE.md', 'cyan');
  log('  🐛 Support: Check the migration guide for troubleshooting', 'cyan');
  
  // Start the development server
  try {
    log('\n🌐 Starting development server...', 'blue');
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    log('❌ Failed to start development server', 'red');
    console.error(error.message);
    log('You can start it manually with: npm run dev', 'yellow');
  }
}

function printBanner() {
  log('╔══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                     🚀 BoilerAI Migration                    ║', 'cyan');
  log('║                  MongoDB → Supabase Complete                 ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════╝', 'cyan');
  log('');
}

// Main execution
function main() {
  printBanner();
  
  try {
    checkRequirements();
    installDependencies();
    createSupabaseSchema();
  } catch (error) {
    log('❌ Setup failed', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n👋 Setup interrupted. Run this script again to continue.', 'yellow');
  process.exit(0);
});

if (require.main === module) {
  main();
}
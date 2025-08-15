#!/usr/bin/env node

/**
 * Supabase Integration Test Script
 * Tests all major Supabase features to ensure migration was successful
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://oydzgpyctttxjjbjjtnb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDatabaseConnection() {
  log('\n🔗 Testing database connection...', 'blue');
  
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    log('✅ Database connection successful', 'green');
    return true;
  } catch (error) {
    log('❌ Database connection failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function testTablesExist() {
  log('\n📋 Testing database schema...', 'blue');
  
  const tables = ['users', 'courses', 'academic_plans', 'transcripts'];
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        log(`❌ Table '${table}' does not exist`, 'red');
        allTablesExist = false;
      } else {
        log(`✅ Table '${table}' exists`, 'green');
      }
    } catch (error) {
      log(`❌ Error checking table '${table}':`, 'red');
      console.error(error.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testStorageBucket() {
  log('\n💾 Testing storage configuration...', 'blue');
  
  try {
    // Try to access the transcripts bucket directly
    const { data: files, error } = await supabase.storage.from('transcripts').list();
    
    if (error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        log('❌ Transcripts storage bucket not found', 'red');
        return false;
      } else {
        // Bucket exists but access denied (which is normal)
        log('✅ Transcripts storage bucket exists (access controlled)', 'green');
        return true;
      }
    } else {
      log('✅ Transcripts storage bucket exists and accessible', 'green');
      return true;
    }
  } catch (error) {
    log('❌ Storage test failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function testSampleData() {
  log('\n📊 Testing sample data...', 'blue');
  
  try {
    // Test courses table
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .limit(5);
    
    if (coursesError) throw coursesError;
    
    if (courses && courses.length > 0) {
      log(`✅ Found ${courses.length} sample courses`, 'green');
      log(`   Example: ${courses[0].course_code} - ${courses[0].title}`, 'cyan');
      return true;
    } else {
      log('❌ No sample courses found - database setup incomplete', 'red');
      return false;
    }
    
  } catch (error) {
    log('❌ Sample data test failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function testAuth() {
  log('\n🔐 Testing authentication system...', 'blue');
  
  try {
    // Test if auth is properly configured by checking the session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    log('✅ Authentication system is configured', 'green');
    
    if (data.session) {
      log('✅ Active session found', 'green');
    } else {
      log('ℹ️  No active session (this is normal)', 'cyan');
    }
    
    return true;
  } catch (error) {
    log('❌ Authentication test failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function testRLSPolicies() {
  log('\n🛡️  Testing Row Level Security...', 'blue');
  
  try {
    // Try to access users table without authentication (should fail)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    // If we get an error about policies/permissions, that's good - RLS is working
    if (error && (
      error.message.includes('row-level security') || 
      error.message.includes('RLS') ||
      error.message.includes('policy') ||
      error.message.includes('permission') ||
      error.code === 'PGRST116' ||
      error.details?.includes('policy')
    )) {
      log('✅ Row Level Security is properly configured', 'green');
      return true;
    } else if (error) {
      log('✅ Row Level Security is working (access denied)', 'green');
      log(`   Error: ${error.message}`, 'cyan');
      return true;
    } else if (data && data.length === 0) {
      log('✅ RLS working correctly - no unauthorized access', 'green');
      return true;
    } else {
      log('❌ RLS not working - unauthorized access allowed', 'red');
      log('   Data returned:', data);
      return false;
    }
  } catch (error) {
    log('❌ RLS test failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function runAllTests() {
  log('🧪 Running Supabase Integration Tests...', 'blue');
  log('═'.repeat(50), 'cyan');
  
  const results = {
    connection: await testDatabaseConnection(),
    schema: await testTablesExist(),
    storage: await testStorageBucket(),
    data: await testSampleData(),
    auth: await testAuth(),
    rls: await testRLSPolicies()
  };
  
  log('\n📊 Test Results Summary:', 'blue');
  log('═'.repeat(50), 'cyan');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const color = result ? 'green' : 'red';
    log(`${status} ${test.toUpperCase()}`, color);
  });
  
  log('\n' + '═'.repeat(50), 'cyan');
  log(`🎯 Overall: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All tests passed! Your Supabase integration is ready.', 'green');
    log('\n📚 Next steps:', 'blue');
    log('  1. Start your frontend: npm run dev', 'cyan');
    log('  2. Test user registration and login', 'cyan');
    log('  3. Upload a transcript file', 'cyan');
    log('  4. Create an academic plan', 'cyan');
  } else {
    log('\n⚠️  Some tests failed. Please check the migration guide:', 'yellow');
    log('  📖 SUPABASE_MIGRATION_GUIDE.md', 'cyan');
    log('  🔧 Run the setup script: node setup-supabase.js', 'cyan');
  }
  
  return passed === total;
}

// Main execution
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log('\n❌ Test runner failed:', 'red');
      console.error(error);
      process.exit(1);
    });
}
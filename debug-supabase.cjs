const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://oydzgpyctttxjjbjjtnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZHpncHljdHR0eGpqYmpqdG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDE3NjksImV4cCI6MjA3MDYxNzc2OX0.EH_wdZ9Jda7Lr-x4LC-ROil6D1GnCYtzEFTn-pwpS24';

console.log('🔗 Using URL:', supabaseUrl);
console.log('🔑 Using Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log('🔍 Debugging Supabase setup...\n');

  // Check storage buckets
  console.log('📦 Checking storage buckets...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log('❌ Storage error:', error.message);
      console.log('   Error details:', error);
    } else {
      console.log('📦 Buckets found:', buckets);
      
      // Try to access transcripts bucket specifically
      const { data: files, error: filesError } = await supabase.storage.from('transcripts').list();
      if (filesError) {
        console.log('❌ Transcripts bucket error:', filesError.message);
      } else {
        console.log('✅ Transcripts bucket accessible');
      }
    }
  } catch (e) {
    console.log('❌ Storage check failed:', e.message);
  }

  // Check courses data
  console.log('\n📚 Checking courses data...');
  try {
    const { data: courses, error } = await supabase.from('courses').select('*').limit(5);
    if (error) {
      console.log('❌ Courses error:', error.message);
    } else {
      console.log('📚 Courses found:', courses.length);
      if (courses.length > 0) {
        console.log('   Example:', courses[0].course_code, '-', courses[0].title);
      }
    }
  } catch (e) {
    console.log('❌ Courses check failed:', e.message);
  }

  // Check RLS policies
  console.log('\n🛡️  Checking RLS policies...');
  try {
    const { data: users, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
      console.log('✅ RLS working - access denied:', error.message);
    } else {
      console.log('❌ RLS not working - got data:', users);
    }
  } catch (e) {
    console.log('❌ RLS check failed:', e.message);
  }

  // Check if we can access the API directly
  console.log('\n🌐 Testing direct API access...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/courses?select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const result = await response.json();
    console.log('🌐 Direct API response:', result);
  } catch (e) {
    console.log('❌ Direct API failed:', e.message);
  }
}

debug().catch(console.error);
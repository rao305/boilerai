const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://oydzgpyctttxjjbjjtnb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to provide this
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boilerfn';

// MongoDB User schema (copy from your existing model)
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  hashedPassword: String,
  transcriptData: mongoose.Schema.Types.Mixed,
  academicPlan: mongoose.Schema.Types.Mixed,
  preferences: {
    theme: String,
    notifications: Boolean
  },
  lastLogin: Date,
  isActive: Boolean,
  emailVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  openaiApiKey: String,
  hasApiKey: Boolean,
  apiKeyUpdatedAt: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function migrateUsers() {
  console.log('🚀 Starting user migration...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users from MongoDB
    const mongoUsers = await User.find({});
    console.log(`📊 Found ${mongoUsers.length} users to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const mongoUser of mongoUsers) {
      try {
        console.log(`📝 Migrating user: ${mongoUser.email}`);

        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: mongoUser.email,
          password: 'temp_password_123!', // Temporary password, users will need to reset
          email_confirm: mongoUser.emailVerified || false,
          user_metadata: {
            name: mongoUser.name
          }
        });

        if (authError) {
          console.error(`❌ Auth error for ${mongoUser.email}:`, authError.message);
          errorCount++;
          continue;
        }

        console.log(`✅ Created auth user for ${mongoUser.email}`);

        // Insert user data into public.users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authUser.user.id,
            email: mongoUser.email,
            name: mongoUser.name,
            created_at: mongoUser.createdAt || new Date().toISOString(),
            updated_at: mongoUser.updatedAt || new Date().toISOString(),
            last_login: mongoUser.lastLogin?.toISOString() || null,
            email_verified: mongoUser.emailVerified || false,
            preferences: mongoUser.preferences || { theme: 'system', notifications: true },
            transcript_data: mongoUser.transcriptData || null,
            academic_plan: mongoUser.academicPlan || null,
            has_api_key: mongoUser.hasApiKey || false,
            api_key_updated_at: mongoUser.apiKeyUpdatedAt?.toISOString() || null
          });

        if (userError) {
          console.error(`❌ User data error for ${mongoUser.email}:`, userError.message);
          errorCount++;
          continue;
        }

        console.log(`✅ Migrated user data for ${mongoUser.email}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error migrating user ${mongoUser.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`❌ Failed migrations: ${errorCount} users`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function migrateCourses() {
  console.log('🚀 Starting course data migration...');
  
  // Sample Purdue courses - you can expand this based on your existing course data
  const purdueCoursesData = [
    {
      course_code: 'CS180',
      title: 'Problem Solving and Object-Oriented Programming',
      description: 'Problem solving and algorithms, implementation of algorithms in a high level programming language, conditionals, the iterative approach and the recursive approach, strings and string processing, problem solving strategies, algorithms for searching and sorting arrays, abstract data types, object-oriented programming, classes, subclasses, inheritance, polymorphism, exception handling, file I/O, graphical user interfaces, data structures.',
      credits: 4,
      prerequisites: [],
      department: 'Computer Science',
      level: 100
    },
    {
      course_code: 'CS240',
      title: 'Programming in C',
      description: 'The C programming language, structure and style. Emphasis on system programming.',
      credits: 3,
      prerequisites: ['CS180'],
      department: 'Computer Science',
      level: 200
    },
    {
      course_code: 'MA161',
      title: 'Analytic Geometry and Calculus I',
      description: 'Introduction to differential and integral calculus of one variable, with applications.',
      credits: 5,
      prerequisites: [],
      department: 'Mathematics',
      level: 100
    },
    {
      course_code: 'MA162',
      title: 'Analytic Geometry and Calculus II',
      description: 'Continuation of MA 161.',
      credits: 5,
      prerequisites: ['MA161'],
      department: 'Mathematics',
      level: 100
    }
  ];

  try {
    const { error } = await supabase
      .from('courses')
      .insert(purdueCoursesData);

    if (error) {
      console.error('❌ Course migration error:', error);
    } else {
      console.log(`✅ Successfully migrated ${purdueCoursesData.length} courses`);
    }
  } catch (error) {
    console.error('❌ Course migration failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting complete migration to Supabase...\n');

  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.log('Please get your service role key from Supabase dashboard > Settings > API');
    process.exit(1);
  }

  await migrateCourses();
  await migrateUsers();
  
  console.log('\n🎉 Migration completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Run the SQL schema in your Supabase dashboard');
  console.log('2. Users will need to reset their passwords using Supabase Auth');
  console.log('3. Update your frontend to use the new Supabase client');
}

// Run migration if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateUsers, migrateCourses };
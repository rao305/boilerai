const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createUserCorrectDb() {
  try {
    // Connect to the correct database that the backend uses
    await mongoose.connect('mongodb://localhost:27017/purdue-planner');
    console.log('✅ Connected to MongoDB (purdue-planner)');

    // Delete ALL users with testdev email
    const deleteResult = await User.deleteMany({ email: 'testdev@purdue.edu' });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing test users`);

    // Create new test user with plain password (will be hashed by pre-save hook)
    const testUser = new User({
      email: 'testdev@purdue.edu',
      name: 'Test Developer',
      hashedPassword: 'password123', // This will be hashed by the pre-save hook
      emailVerified: true, // Already verified for dev
      profileCompleted: false,
      preferences: {
        theme: 'system',
        notifications: true
      },
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testUser.save();
    console.log('✅ Created fresh test user: testdev@purdue.edu');
    console.log('🆔 User ID:', testUser._id);
    console.log('🎯 Database: purdue-planner');

    // Verify the password works
    const isValid = await testUser.comparePassword('password123');
    console.log('🔑 Password test:', isValid ? 'PASSES' : 'FAILS');

    console.log('\n🚀 You can now login with:');
    console.log('📧 Email: testdev@purdue.edu');
    console.log('🔑 Password: password123');
    console.log('✅ Already verified - no email verification needed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

createUserCorrectDb();
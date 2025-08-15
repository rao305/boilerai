const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/purdue_planner');
    console.log('✅ Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'testdev@purdue.edu' });
    if (existingUser) {
      console.log('📧 Test user already exists: testdev@purdue.edu');
      
      // Just verify the existing user
      existingUser.emailVerified = true;
      existingUser.emailVerificationToken = undefined;
      existingUser.emailVerificationExpires = undefined;
      await existingUser.save();
      
      console.log('✅ Test user is now verified!');
    } else {
      // Create new test user
      const testUser = new User({
        email: 'testdev@purdue.edu',
        name: 'Test Developer',
        classStatus: 'senior',
        major: 'Computer Science',
        hashedPassword: 'password123', // Will be hashed by pre-save hook
        emailVerified: true, // Already verified for dev
        transcriptData: null,
        academicPlan: null,
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
      console.log('✅ Created test user: testdev@purdue.edu');
      console.log('🔑 Password: password123');
    }

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

createTestUser();
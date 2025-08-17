const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/purdue-planner');
    console.log('✅ Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'testdev@purdue.edu' });
    console.log('📧 User found:', user ? 'YES' : 'NO');
    console.log('🔒 Email verified:', user?.emailVerified);
    console.log('🔑 Password hash:', user?.hashedPassword?.substring(0, 20) + '...');

    // Test password comparison
    if (user) {
      const isValid = await user.comparePassword('password123');
      console.log('✅ Password valid:', isValid);
      
      if (!isValid) {
        console.log('🔍 Debugging: Testing different passwords...');
        // Let's see if it's a different password
        const tests = ['password', 'Password123', 'admin123', 'test123', 'password123', 'DevPassword2024!'];
        for (const test of tests) {
          const result = await user.comparePassword(test);
          console.log(`   ${test}: ${result}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testLogin();
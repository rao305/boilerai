// Quick test for email configuration
require('dotenv').config({ path: './backend/.env' });
const emailService = require('./backend/src/services/emailService');

async function testEmail() {
  console.log('🧪 Testing email service...');
  console.log('Environment variables:');
  console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('- EMAIL_USER:', process.env.EMAIL_USER);
  console.log('- EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('- EMAIL_PORT:', process.env.EMAIL_PORT);
  
  try {
    // Generate a test token
    const testToken = emailService.generateVerificationToken();
    console.log('Generated test token:', testToken);
    
    // Try to send verification email
    const result = await emailService.sendVerificationEmail(
      'test@purdue.edu',
      'Test User',
      testToken
    );
    
    console.log('Email result:', result);
    
    if (result.success) {
      console.log('✅ Email service is working!');
      if (result.previewUrl) {
        console.log('📧 Preview URL:', result.previewUrl);
      }
    } else {
      console.log('❌ Email service failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEmail();
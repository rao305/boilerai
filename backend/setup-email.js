#!/usr/bin/env node

/**
 * Email Service Setup Helper
 * This script helps you test your email configuration before deployment
 */

const emailService = require('./src/services/emailService');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('🤖 BoilerAI Email Service Setup Helper\n');
  
  // Show current configuration
  console.log('📧 Current Email Configuration:');
  console.log(`Service: ${process.env.EMAIL_SERVICE || 'Not set (will use Ethereal)'}`);
  console.log(`User: ${process.env.EMAIL_USER || 'Not set'}`);
  console.log(`From: ${process.env.EMAIL_FROM || '"BoilerAI" <noreply@boilerai.com>'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}\n`);

  // Test email service initialization
  console.log('🔧 Testing email service initialization...');
  try {
    await emailService.ensureTransporter();
    console.log('✅ Email service initialized successfully!\n');
  } catch (error) {
    console.error('❌ Email service failed to initialize:', error.message);
    console.log('\n💡 To fix this:');
    console.log('1. Set EMAIL_USER and EMAIL_PASS in your .env file');
    console.log('2. For Gmail: Use App Password (not regular password)');
    console.log('3. For SendGrid: Use "apikey" as user and API key as password\n');
    process.exit(1);
  }

  // Ask if user wants to send a test email
  rl.question('📤 Would you like to send a test verification email? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      rl.question('📧 Enter a test email address (@purdue.edu): ', async (email) => {
        if (!email.endsWith('@purdue.edu')) {
          console.log('❌ Please use a @purdue.edu email address');
          rl.close();
          return;
        }

        console.log(`\n📤 Sending test verification email to ${email}...`);
        
        try {
          const token = emailService.generateVerificationToken();
          const result = await emailService.sendVerificationEmail(email, 'Test User', token);
          
          if (result.success) {
            console.log('✅ Test email sent successfully!');
            if (result.previewUrl) {
              console.log(`🔗 Preview URL: ${result.previewUrl}`);
            }
            console.log('\n🎉 Your email service is working correctly!');
            console.log('📝 Next steps:');
            console.log('1. Check the recipient\'s inbox for the verification email');
            console.log('2. Click the verification link to test the complete flow');
            console.log('3. Deploy your application with confidence!');
          } else {
            console.error('❌ Failed to send test email:', result.error);
          }
        } catch (error) {
          console.error('❌ Error sending test email:', error.message);
        }
        
        rl.close();
      });
    } else {
      console.log('\n✅ Email service is ready for production!');
      console.log('📝 Remember to:');
      console.log('1. Set production environment variables');
      console.log('2. Update FRONTEND_URL to your production domain');
      console.log('3. Monitor email delivery in production');
      rl.close();
    }
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
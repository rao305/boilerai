const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// Store email configuration in memory (in production, use database)
let emailConfig = {
  emailUser: process.env.EMAIL_USER || null,
  emailPass: process.env.EMAIL_PASS || null,
  emailFrom: process.env.EMAIL_FROM || null,
  status: process.env.EMAIL_USER && process.env.EMAIL_PASS ? 'active' : 'inactive'
};

// Get current email configuration
router.get('/email-config', (req, res) => {
  res.json({
    emailUser: emailConfig.emailUser,
    emailFrom: emailConfig.emailFrom,
    status: emailConfig.status,
    hasCredentials: !!(emailConfig.emailUser && emailConfig.emailPass)
  });
});

// Setup email configuration
router.post('/setup-email', async (req, res) => {
  try {
    const { emailUser, emailPass, emailFrom } = req.body;

    if (!emailUser || !emailPass) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailUser)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Test the email configuration
    console.log('🧪 Testing email configuration with Outlook SMTP...');
    
    const testTransporter = nodemailer.createTransporter({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    // Verify connection
    await testTransporter.verify();

    // Update configuration
    emailConfig = {
      emailUser,
      emailPass,
      emailFrom: emailFrom || `BoilerAI Academic Planner <${emailUser}>`,
      status: 'active'
    };

    // Update environment variables for current session
    process.env.EMAIL_USER = emailUser;
    process.env.EMAIL_PASS = emailPass;
    process.env.EMAIL_FROM = emailConfig.emailFrom;
    process.env.EMAIL_SERVICE = 'outlook';

    // Update the email service in the main app
    if (global.emailService) {
      await global.emailService.initializeTransporter();
    }

    console.log('✅ Email configuration updated successfully');
    
    res.json({
      success: true,
      message: 'Email service configured successfully',
      config: {
        emailUser: emailConfig.emailUser,
        emailFrom: emailConfig.emailFrom,
        status: emailConfig.status
      }
    });

  } catch (error) {
    console.error('❌ Email configuration failed:', error);
    
    let errorMessage = 'Failed to configure email service';
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your email and password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Please check your internet connection.';
    } else if (error.message.includes('Invalid login')) {
      errorMessage = 'Invalid login credentials. Please check your email and password.';
    }

    res.status(400).json({ 
      error: errorMessage,
      details: error.message 
    });
  }
});

// Test email service
router.post('/test-email', async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!emailConfig.emailUser || !emailConfig.emailPass) {
      return res.status(400).json({ 
        success: false,
        message: 'Email service not configured. Please set up email credentials first.' 
      });
    }

    const testTransporter = nodemailer.createTransporter({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: emailConfig.emailUser,
        pass: emailConfig.emailPass
      }
    });

    const testEmailAddress = testEmail || emailConfig.emailUser;

    await testTransporter.sendMail({
      from: emailConfig.emailFrom,
      to: testEmailAddress,
      subject: 'BoilerAI Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">🎉 Email Service Test Successful!</h2>
          <p>This is a test email from your BoilerAI Academic Planner system.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>Email Service: Microsoft Outlook SMTP</li>
            <li>Sender: ${emailConfig.emailFrom}</li>
            <li>Status: Active and Working</li>
            <li>Test Time: ${new Date().toLocaleString()}</li>
          </ul>
          <p style="color: #38a169;"><strong>✅ Your email verification system is now ready for production!</strong></p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            This email was sent from your BoilerAI Academic Planner system to test the email configuration.
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: `Test email sent successfully to ${testEmailAddress}! Check your inbox.`
    });

  } catch (error) {
    console.error('❌ Test email failed:', error);
    
    let errorMessage = 'Failed to send test email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please reconfigure your email credentials.';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      details: error.message
    });
  }
});

// Reset email configuration
router.post('/reset-email', (req, res) => {
  emailConfig = {
    emailUser: null,
    emailPass: null,
    emailFrom: null,
    status: 'inactive'
  };

  // Clear environment variables
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  delete process.env.EMAIL_FROM;

  console.log('🔄 Email configuration reset');
  
  res.json({
    success: true,
    message: 'Email configuration reset successfully'
  });
});

module.exports = router;
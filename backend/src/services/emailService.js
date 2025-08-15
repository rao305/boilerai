const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      this.transporter = await this.createTransporter();
      await this.verifyConnection();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      // Fallback to console logging for development
      this.transporter = this.createFallbackTransporter();
    }
  }

  async createTransporter() {
    // Always try to use real email service if credentials are provided
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const service = process.env.EMAIL_SERVICE || 'outlook';
      console.log(`🔧 Configuring real email service: ${service}...`);
      
      return this.createProductionTransporter(service);
    } 
    
    // Development mode - try to create Ethereal test account
    console.log('🔧 Creating Ethereal test account for development...');
    const testAccount = await nodemailer.createTestAccount();
    
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  createProductionTransporter(service) {
    const serviceConfigs = {
      gmail: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      },
      sendgrid: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      },
      mailgun: {
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      },
      outlook: {
        host: process.env.EMAIL_HOST || 'smtp-mail.outlook.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      }
    };

    const config = serviceConfigs[service.toLowerCase()];
    if (!config) {
      throw new Error(`Unsupported email service: ${service}. Supported services: gmail, sendgrid, mailgun, outlook`);
    }

    return nodemailer.createTransport(config);
  }

  createFallbackTransporter() {
    console.log('🔧 Using fallback email service (console logging)');
    // Return a mock transporter that logs to console
    return {
      sendMail: async (mailOptions) => {
        console.log('📧 FALLBACK EMAIL SERVICE - Email would be sent:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Verification URL would be in email body');
        return {
          messageId: 'fallback-' + Date.now(),
          accepted: [mailOptions.to]
        };
      },
      verify: async () => true
    };
  }

  async verifyConnection() {
    if (this.transporter && typeof this.transporter.verify === 'function') {
      await this.transporter.verify();
    }
  }

  async ensureTransporter() {
    if (!this.transporter) {
      await this.initializeTransporter();
    }
    return this.transporter;
  }

  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  createVerificationUrl(token) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${baseUrl}/verify-email?token=${token}`;
  }

  getVerificationEmailTemplate(name, verificationUrl) {
    return {
      subject: 'Verify Your BoilerAI Account - Complete Your Registration',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🤖 BoilerAI</h1>
            <p>Your AI-Powered Academic Assistant</p>
          </div>
          
          <div class="content">
            <h2>Hi ${name}!</h2>
            
            <p>Thanks for signing up for BoilerAI! We're excited to help you navigate your academic journey at Purdue University with the power of AI.</p>
            
            <p>To get started, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify My Email</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f4f4f4; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This verification link will expire in 24 hours. If you don't verify your email within this time, you'll need to request a new verification email.
            </div>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
              <li>📊 Upload and analyze your transcript</li>
              <li>📅 Create personalized academic plans</li>
              <li>🤖 Get AI-powered course recommendations</li>
              <li>📈 Track your progress toward graduation</li>
            </ul>
            
            <p>If you didn't create this account, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The BoilerAI Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to verify your Purdue email address.</p>
            <p>For support, contact us at support@boilerai.com</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${name}!

        Thanks for signing up for BoilerAI!

        Please verify your email address by visiting this link:
        ${verificationUrl}

        This link will expire in 24 hours.

        Once verified, you'll be able to upload transcripts, create academic plans, and get AI-powered recommendations.

        If you didn't create this account, you can safely ignore this email.

        Best regards,
        The BoilerAI Team
      `
    };
  }

  async sendVerificationEmail(email, name, token) {
    try {
      const transporter = await this.ensureTransporter();
      const verificationUrl = this.createVerificationUrl(token);
      const template = this.getVerificationEmailTemplate(name, verificationUrl);

      const mailOptions = {
        from: process.env.EMAIL_FROM || '"BoilerAI" <noreply@boilerai.com>',
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await transporter.sendMail(mailOptions);
      
      // Log preview URL for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Verification email sent!');
        console.log('Preview URL:', nodemailer.getTestMessageUrl(result));
      }

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(result) : null
      };
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendVerificationEmailWithCredentials(email, name, token, outlookEmail, outlookPassword) {
    try {
      console.log(`🔧 Creating custom transporter with Purdue email: ${outlookEmail}...`);
      
      // For Purdue emails, try different SMTP configurations
      let customTransporter;
      
      if (outlookEmail.endsWith('@purdue.edu')) {
        // Try Purdue's SMTP server first
        console.log('📧 Attempting Purdue SMTP configuration...');
        customTransporter = nodemailer.createTransporter({
          host: 'smtp.office365.com',  // Office 365 for Purdue
          port: 587,
          secure: false,
          auth: {
            user: outlookEmail,
            pass: outlookPassword
          }
        });
      } else {
        // Fallback to regular Outlook SMTP
        console.log('📧 Using Outlook SMTP configuration...');
        customTransporter = nodemailer.createTransporter({
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          auth: {
            user: outlookEmail,
            pass: outlookPassword
          }
        });
      }

      // Verify the connection
      await customTransporter.verify();
      console.log('✅ Custom Outlook transporter verified successfully');

      const verificationUrl = this.createVerificationUrl(token);
      const template = this.getVerificationEmailTemplate(name, verificationUrl);

      const mailOptions = {
        from: `"BoilerAI Academic Planner" <${outlookEmail}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await customTransporter.sendMail(mailOptions);
      
      console.log('✅ Verification email sent via user\'s Purdue account!');
      console.log(`📧 From: ${outlookEmail} → To: ${email}`);

      return {
        success: true,
        messageId: result.messageId,
        sentVia: outlookEmail
      };
    } catch (error) {
      console.error('❌ Failed to send verification email with user credentials:', error);
      
      let errorMessage = 'Failed to send verification email';
      if (error.code === 'EAUTH') {
        errorMessage = 'Invalid Purdue email credentials. Please check your email and password.';
      } else if (error.message.includes('Invalid login')) {
        errorMessage = 'Authentication failed with your Purdue email account. Please verify your credentials.';
      }
      
      return {
        success: false,
        error: errorMessage,
        details: error.message
      };
    }
  }

  async sendPasswordResetEmail(email, name, resetUrl) {
    try {
      const transporter = await this.ensureTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"BoilerAI" <noreply@boilerai.com>',
        to: email,
        subject: 'Reset Your Password - Purdue Academic Planner',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Reset Your Password</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .warning { background: #ffebee; border: 1px solid #f48fb1; color: #c62828; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔒 Password Reset</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${name}!</h2>
              
              <p>We received a request to reset your password for your Purdue Academic Planner account.</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This reset link will expire in 1 hour. If you didn't request this reset, please ignore this email.
              </div>
              
              <p>If you didn't request a password reset, your account is still secure and no action is needed.</p>
            </div>
          </body>
          </html>
        `,
        text: `
          Hi ${name}!

          We received a request to reset your password.

          Reset your password: ${resetUrl}

          This link expires in 1 hour.

          If you didn't request this, please ignore this email.
        `
      };

      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
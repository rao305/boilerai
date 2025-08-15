import nodemailer from 'nodemailer';
import { env } from '../config/env';
import logger from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email service
 */
export async function initializeEmailService(): Promise<void> {
  if (!env.FALLBACK_MAGIC_LINK) {
    logger.info('Email service disabled - magic link fallback is off');
    return;
  }

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('Email service not configured - missing SMTP settings');
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: env.NODE_ENV === 'production'
      }
    });

    // Verify connection
    await transporter.verify();
    logger.info('✅ Email service initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize email service:', error);
    transporter = null;
  }
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    logger.error('Email service not initialized');
    return false;
  }

  try {
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Generate magic link email HTML template
 */
export function generateMagicLinkEmail(
  email: string,
  magicLink: string,
  expiresInMinutes: number = 10
): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to Purdue Auth</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 2rem;
            }
            .logo {
                font-size: 1.8rem;
                font-weight: 700;
                color: #DAA520;
                margin-bottom: 0.5rem;
            }
            .signin-button {
                display: inline-block;
                background: #0078d4;
                color: white;
                text-decoration: none;
                padding: 1rem 2rem;
                border-radius: 8px;
                font-weight: 500;
                font-size: 1.1rem;
                margin: 1.5rem 0;
                text-align: center;
                transition: background-color 0.2s ease;
            }
            .signin-button:hover {
                background: #106ebe;
            }
            .warning-box {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 6px;
                padding: 1rem;
                margin: 1.5rem 0;
                color: #856404;
            }
            .security-notice {
                background: #f8f9fa;
                border-left: 4px solid #DAA520;
                padding: 1rem;
                margin-top: 2rem;
                font-size: 0.9rem;
                color: #666;
            }
            .footer {
                text-align: center;
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid #e9ecef;
                font-size: 0.85rem;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🚀 Purdue Auth</div>
                <p style="color: #666; margin: 0;">Secure sign-in for Purdue University</p>
            </div>

            <h2 style="color: #333; margin-bottom: 1rem;">Sign in to your account</h2>
            
            <p>Hello,</p>
            <p>Click the button below to securely sign in to your Purdue account:</p>

            <div style="text-align: center; margin: 2rem 0;">
                <a href="${magicLink}" class="signin-button">
                    🔑 Sign in to Purdue Auth
                </a>
            </div>

            <div class="warning-box">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                    <li>This link expires in ${expiresInMinutes} minutes</li>
                    <li>It can only be used once</li>
                    <li>Only click if you requested this sign-in</li>
                </ul>
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 0.75rem; border-radius: 4px; font-family: monospace; font-size: 0.9rem;">
                ${magicLink}
            </p>

            <div class="security-notice">
                <strong>🔒 Security Notice</strong><br>
                If you didn't request this sign-in link, please ignore this email. Your account remains secure.
            </div>

            <div class="footer">
                <p>This email was sent to ${email}</p>
                <p>Purdue University Authentication Service</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
Sign in to Purdue Auth

Hello,

Click the link below to securely sign in to your Purdue account:
${magicLink}

IMPORTANT:
- This link expires in ${expiresInMinutes} minutes
- It can only be used once
- Only click if you requested this sign-in

If you didn't request this sign-in link, please ignore this email. Your account remains secure.

This email was sent to ${email}
Purdue University Authentication Service
  `;

  return { html, text };
}

/**
 * Send magic link email
 */
export async function sendMagicLinkEmail(
  email: string,
  magicLink: string,
  expiresInMinutes: number = 10
): Promise<boolean> {
  if (!env.FALLBACK_MAGIC_LINK) {
    logger.warn('Magic link email requested but feature is disabled');
    return false;
  }

  const { html, text } = generateMagicLinkEmail(email, magicLink, expiresInMinutes);

  return await sendEmail({
    to: email,
    subject: 'Sign in to Purdue Auth',
    html,
    text
  });
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
  if (!transporter) {
    return false;
  }

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    logger.error('Email configuration test failed:', error);
    return false;
  }
}

export default {
  initializeEmailService,
  sendEmail,
  sendMagicLinkEmail,
  testEmailConfiguration,
  generateMagicLinkEmail
};
# Email Verification Setup Guide

Your Purdue Academic Planner already has **complete email verification** implemented! This guide explains how to configure production email sending.

## 🎉 What's Already Implemented

### Backend Email System ✅
- **Complete User model** with email verification fields
- **Secure verification tokens** using crypto.randomBytes()
- **Email service** with Nodemailer (Gmail/SMTP ready)
- **Beautiful HTML email templates** with Purdue branding
- **Full API endpoints**: `/verify-email`, `/resend-verification`, `/verification-status`
- **Authentication flow** that blocks unverified users

### Frontend UI ✅
- **Modern login/signup pages** with real-time validation
- **Email verification page** with status handling
- **Resend verification functionality**
- **Complete AuthContext** integration
- **Beautiful error handling** and loading states

## 🔧 Production Email Setup (Gmail)

### Step 1: Enable Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account
2. Go to [Google Account Settings](https://myaccount.google.com/)
3. Navigate to **Security** → **App passwords**
4. Generate an app password for "Mail"
5. Copy the 16-character password

### Step 2: Configure Environment Variables

Create `.env` file in `/backend/` directory:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_app_password
EMAIL_FROM="Purdue Academic Planner" <noreply@purdueacademicplanner.com>

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Other required variables
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret_here
MONGODB_URI=your_mongodb_connection_string
```

### Step 3: Alternative Email Services

#### SendGrid (Recommended for Production)
```env
EMAIL_SERVICE=SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM="Purdue Academic Planner" <noreply@yourdomain.com>
```

#### AWS SES
```env
EMAIL_SERVICE=SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
EMAIL_FROM="Purdue Academic Planner" <noreply@yourdomain.com>
```

#### Custom SMTP
```env
EMAIL_SERVICE=smtp
SMTP_HOST=your.smtp.server.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your_username
EMAIL_PASS=your_password
EMAIL_FROM="Purdue Academic Planner" <noreply@yourdomain.com>
```

## 🧪 Testing Email Verification

### Development Mode (Ethereal)
- **Automatic**: Uses fake SMTP service
- **Preview emails**: Check console for preview URLs
- **No real emails sent**: Perfect for development

### Production Testing
1. **Register new account** with @purdue.edu email
2. **Check email inbox** for verification email
3. **Click verification link** or copy token
4. **Verify account** activation

## 📋 Complete Authentication Flow

### Registration Process:
1. ✅ **User submits form** → Validates @purdue.edu email
2. ✅ **Account created** → Email verification token generated
3. ✅ **Verification email sent** → Beautiful HTML template
4. ✅ **User blocked from login** → Until email verified
5. ✅ **User clicks link** → Account activated & auto-logged in

### Login Process:
1. ✅ **User attempts login** → Checks email verification status
2. ✅ **Unverified users blocked** → Shows "verify email" message
3. ✅ **Verified users login** → JWT token issued
4. ✅ **Resend option available** → If verification needed

## 🛠️ Email Service Configuration

The email service automatically detects environment:
- **Development**: Uses Ethereal (fake SMTP) with preview URLs
- **Production**: Uses configured email service (Gmail/SendGrid/etc.)

### Email Template Features:
- **Professional design** with Purdue branding
- **Responsive HTML** that works on all devices
- **Security warnings** about link expiration
- **Fallback text version** for accessibility
- **Clear call-to-action** buttons

## 📧 Email Template Customization

Templates are in `/backend/src/services/emailService.js`:
- **Verification email**: Complete with branding and security notices
- **Password reset**: Ready for future implementation
- **Consistent styling**: Professional appearance
- **Configurable URLs**: Automatic environment detection

## 🔒 Security Features

### Token Security:
- **Cryptographically secure** token generation
- **24-hour expiration** for verification tokens
- **Single-use tokens** automatically deleted after use
- **Database indexing** for performance

### Authentication Security:
- **Email verification required** before login
- **JWT tokens** with expiration
- **Password hashing** with bcrypt (salt rounds: 12)
- **Rate limiting** protection
- **Input validation** and sanitization

## 🚀 Next Steps

1. **Configure email service** using steps above
2. **Set environment variables** in production
3. **Test registration flow** with real @purdue.edu email
4. **Monitor email delivery** and user activation rates
5. **Optional**: Set up email analytics and delivery monitoring

Your email verification system is **production-ready**! Just configure your email service and you're good to go.
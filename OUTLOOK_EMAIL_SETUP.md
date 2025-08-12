# 📧 Microsoft Outlook SMTP Setup for BoilerAI

## 🚀 Quick Setup Guide

To enable real email verification for `@purdue.edu` students, you need to configure a Microsoft Outlook account to send verification emails.

## Step 1: Get Your Outlook Credentials

### Option A: Use Personal Outlook Account
1. **Go to**: https://outlook.live.com
2. **Sign in** with your Microsoft account (or create one)
3. **Enable 2-Factor Authentication** (required for app passwords)
4. **Generate App Password**:
   - Go to Security settings: https://account.microsoft.com/security
   - Click "Advanced security options"
   - Under "App passwords", click "Create a new app password"
   - Name it "BoilerAI Academic Planner"
   - **Copy the generated password** (you'll need this)

### Option B: Use Office 365 Account
If you have access to an Office 365 account:
1. Use your Office 365 email and password
2. May need to enable "Less secure app access" in admin settings

## Step 2: Configure Backend

**Edit the file:** `/Users/rrao/Desktop/final/backend/.env`

Replace these lines:
```bash
EMAIL_USER=your_outlook_email@outlook.com
EMAIL_PASS=your_outlook_password_here
EMAIL_FROM="BoilerAI Academic Planner" <your_outlook_email@outlook.com>
```

With your actual credentials:
```bash
EMAIL_USER=youremail@outlook.com
EMAIL_PASS=your_app_password_from_step1
EMAIL_FROM="BoilerAI Academic Planner" <youremail@outlook.com>
```

## Step 3: Test the Setup

1. **Restart the backend server** (it will pick up the new settings)
2. **Go to**: http://localhost:8080
3. **Register with any `@purdue.edu` email**
4. **Check the email inbox** - you should receive a real verification email!

## 🔧 Current Configuration

The system is already configured with these settings:
- **SMTP Server**: smtp-mail.outlook.com
- **Port**: 587 (TLS)
- **Security**: STARTTLS
- **Service**: Microsoft Outlook

## 🧪 Test Process

Once configured, here's what happens:

1. **Student registers** with `rsmith@purdue.edu`
2. **System sends real email** to rsmith@purdue.edu
3. **Email contains verification link** with BoilerAI branding
4. **Student clicks link** → account verified
5. **Student can login** and access full academic planner

## 📋 Email Template Preview

The verification email will look like:

```
Subject: Verify Your BoilerAI Account

Dear Purdue Student,

Welcome to BoilerAI Academic Planner! Please verify your email address to get started.

[Verify Email Address] <- Clickable button

This link will expire in 24 hours.

Best regards,
The BoilerAI Team
```

## 🚨 Security Notes

- **App passwords are more secure** than regular passwords
- **Emails are sent over TLS** (encrypted)
- **Verification links expire** after 24 hours
- **Only `@purdue.edu` emails** can register

## 🔄 Need Help?

If you encounter issues:
1. **Check spam folder** - verification emails might go there
2. **Verify SMTP settings** - make sure host/port are correct
3. **Test app password** - try logging into Outlook with it
4. **Check server logs** - backend will show detailed error messages

## 🎯 Ready to Go!

Once you add your Outlook credentials to the `.env` file and restart the backend, the system will:
- ✅ Send real verification emails to `@purdue.edu` accounts
- ✅ Use professional BoilerAI branding
- ✅ Require email verification before account access
- ✅ Be ready for production deployment

**Frontend Link**: http://localhost:8080

Just update those 3 lines in the `.env` file and restart! 🚀
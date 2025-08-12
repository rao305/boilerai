# Production Email Setup Guide for BoilerAI

This guide will help you set up real email verification for production deployment.

## 📧 Email Service Options

### Option 1: Gmail (Recommended for Small Scale)

**Best for:** Getting started, small user base (<100 emails/day)

1. **Create a dedicated Gmail account**
   ```
   Example: boilerai.app@gmail.com
   ```

2. **Enable 2-Factor Authentication**
   - Go to Google Account settings
   - Security → 2-Step Verification → Turn On

3. **Generate App Password**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "BoilerAI Backend"
   - Copy the 16-character password

4. **Set Environment Variables**
   ```bash
   EMAIL_SERVICE=gmail
   EMAIL_USER=boilerai.app@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop  # 16-character app password
   EMAIL_FROM="BoilerAI" <boilerai.app@gmail.com>
   ```

### Option 2: SendGrid (Recommended for High Volume)

**Best for:** Production apps, high volume (>100 emails/day), better deliverability

1. **Sign up at SendGrid**
   - Visit https://sendgrid.com
   - Create account (free tier: 100 emails/day)

2. **Verify Sender Email**
   - Go to Settings → Sender Authentication
   - Verify your sending email address
   - Complete domain authentication for better deliverability

3. **Create API Key**
   - Go to Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the API key (starts with SG.)

4. **Set Environment Variables**
   ```bash
   EMAIL_SERVICE=sendgrid
   EMAIL_USER=apikey
   EMAIL_PASS=SG.your-actual-sendgrid-api-key-here
   EMAIL_FROM="BoilerAI" <verified-email@yourdomain.com>
   ```

### Option 3: Mailgun (Alternative)

**Best for:** Developers who prefer Mailgun's API

1. **Sign up at Mailgun**
   - Visit https://www.mailgun.com
   - Create account

2. **Get SMTP Credentials**
   - Go to Sending → Domain Settings
   - Copy SMTP credentials

3. **Set Environment Variables**
   ```bash
   EMAIL_SERVICE=mailgun
   EMAIL_USER=your-mailgun-smtp-login
   EMAIL_PASS=your-mailgun-smtp-password
   EMAIL_FROM="BoilerAI" <noreply@yourdomain.com>
   ```

## 🚀 Quick Setup Steps

### 1. Copy Environment File
```bash
cd backend
cp .env.production.example .env
```

### 2. Configure Your Email Service
Edit `.env` and uncomment/fill in your chosen email service:

```bash
# Choose ONE email service and uncomment:

# Gmail (easiest to start)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
EMAIL_FROM="BoilerAI" <your-email@gmail.com>

# OR SendGrid (production recommended)
# EMAIL_SERVICE=sendgrid
# EMAIL_USER=apikey
# EMAIL_PASS=SG.your-sendgrid-api-key
# EMAIL_FROM="BoilerAI" <verified@yourdomain.com>
```

### 3. Set Frontend URL
```bash
# Development
FRONTEND_URL=http://localhost:8080

# Production (replace with your domain)
FRONTEND_URL=https://boilerai.yourdomain.com
```

### 4. Test Your Setup
Start the backend and check the logs:
```bash
npm start
```

Look for:
```
✅ Email service initialized successfully
🔧 Configuring real email service: gmail...
```

### 5. Test Registration
Try registering a new user with a real @purdue.edu email:

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@purdue.edu",
    "password": "password123",
    "name": "Test User"
  }'
```

You should receive a real verification email!

## 🔧 Configuration Details

### Environment Variables

```bash
# Required for production email
EMAIL_SERVICE=gmail|sendgrid|mailgun|outlook
EMAIL_USER=your-email-username
EMAIL_PASS=your-email-password-or-api-key
EMAIL_FROM="BoilerAI" <noreply@yourdomain.com>

# Frontend URL for verification links
FRONTEND_URL=https://yourdomain.com

# Optional: Email verification expiry (default: 24 hours)
EMAIL_VERIFICATION_EXPIRY=86400000
```

### Supported Email Services

| Service  | Free Tier | Setup Difficulty | Deliverability | Best For |
|----------|-----------|------------------|----------------|----------|
| Gmail    | 500/day   | Easy            | Good           | Development, Small apps |
| SendGrid | 100/day   | Medium          | Excellent      | Production apps |
| Mailgun  | 100/day   | Medium          | Excellent      | API-focused apps |
| Outlook  | Limited   | Easy            | Good           | Microsoft ecosystem |

## 🧪 Testing Checklist

- [ ] Backend starts without email errors
- [ ] Registration creates user with `emailVerified: false`
- [ ] Verification email is sent to real email
- [ ] Email verification link works
- [ ] User can login after verification
- [ ] Login fails before verification (with appropriate error)

## 🐛 Troubleshooting

### Gmail Issues
```bash
# Error: "Username and Password not accepted"
# Solution: Make sure you're using App Password, not regular password
```

### SendGrid Issues  
```bash
# Error: "Forbidden"
# Solution: Check API key permissions and sender verification
```

### General Issues
```bash
# Error: "Connection timeout"
# Solution: Check firewall, try different SMTP port (587 vs 465)
```

### Development vs Production
- **Development**: Uses Ethereal (fake emails) when no EMAIL_USER/PASS set
- **Production**: Requires real email service configuration
- **Preview URLs**: Only shown in development mode

## 🚀 Deployment Notes

### Heroku
```bash
heroku config:set EMAIL_SERVICE=sendgrid
heroku config:set EMAIL_USER=apikey
heroku config:set EMAIL_PASS=SG.your-api-key
heroku config:set EMAIL_FROM="BoilerAI <noreply@yourdomain.com>"
heroku config:set FRONTEND_URL=https://your-app.herokuapp.com
```

### Docker
```dockerfile
ENV EMAIL_SERVICE=gmail
ENV EMAIL_USER=your-email@gmail.com
ENV EMAIL_PASS=your-app-password
ENV FRONTEND_URL=https://yourdomain.com
```

### Vercel/Netlify Functions
Set environment variables in your hosting platform's dashboard.

## 📊 Monitoring

### Email Delivery Monitoring
- SendGrid: Built-in analytics dashboard
- Gmail: Limited visibility
- Mailgun: Detailed delivery analytics

### Error Monitoring
Check backend logs for:
```bash
✅ Email service initialized successfully
❌ Email service initialization failed
📧 Verification email sent!
❌ Failed to send verification email
```

## 🔒 Security Notes

1. **Never commit email credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Monitor failed delivery attempts** for abuse
5. **Implement rate limiting** for registration endpoints

## 🆘 Support

If you encounter issues:
1. Check the backend logs first
2. Verify email service credentials
3. Test with a simple curl command
4. Check spam folders for verification emails

---

**Next Steps:** After email is set up, consider implementing:
- Password reset functionality
- Email change verification
- Bulk email notifications
- Email preferences management
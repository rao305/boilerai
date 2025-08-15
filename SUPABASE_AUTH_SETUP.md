# Supabase Authentication Setup Guide

## Overview
This guide walks you through setting up email authentication with Supabase for the BoilerAI application, including email confirmation for @purdue.edu addresses.

## 🚀 Quick Setup

### 1. Database Schema Setup
Run the SQL schema in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the script

### 2. Configure Authentication Settings

In your Supabase dashboard, go to **Authentication > Settings**:

#### Email Auth Configuration
- **Enable email confirmations**: ✅ ON
- **Confirm email on signup**: ✅ ON  
- **Double confirm email changes**: ✅ ON

#### Site URL Configuration
- **Site URL**: `http://localhost:3000` (for development)
- **Production Site URL**: Your production domain

#### Redirect URLs
Add these URLs to **Redirect URLs**:
- `http://localhost:3000/verify-email`
- `http://localhost:3000/dashboard`
- `https://your-production-domain.com/verify-email`
- `https://your-production-domain.com/dashboard`

### 3. Email Templates

#### Custom Email Templates (Optional)
Navigate to **Authentication > Email Templates** to customize:

**Email Confirmation Template:**
```html
<h2>Welcome to BoilerAI!</h2>
<p>Thanks for signing up with your Purdue email address.</p>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>Or copy and paste this URL: {{ .ConfirmationURL }}</p>

<p>Best regards,<br>The BoilerAI Team</p>
```

### 4. Environment Variables

Ensure your `.env` file has the correct Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 🧪 Testing the Authentication Flow

### 1. Development Mode Testing

For development, you can use the bypass mode:
- Email: `/dev`
- Password: `bypass`

### 2. Full Email Testing

1. **Register**: Create account with a @purdue.edu email
2. **Verify**: Check email for verification link
3. **Confirm**: Click the verification link
4. **Onboard**: Complete the onboarding flow
5. **Access**: Use the main dashboard

### 3. Test Scenarios

#### Valid Registration
```
Email: testuser@purdue.edu
Password: TestPassword123!
Name: Test User
```

#### Email Validation
- ✅ `student@purdue.edu`
- ❌ `student@gmail.com`
- ❌ `invalid-email`

#### Error Handling
- Duplicate email registration
- Invalid email format
- Weak passwords
- Expired verification links

## 🔧 Advanced Configuration

### SMTP Configuration (Production)

For production, configure custom SMTP:

1. Go to **Settings > Auth > SMTP Settings**
2. Configure your email provider:
   - **Host**: smtp.gmail.com (or your provider)
   - **Port**: 587 or 465
   - **Username**: your-email@domain.com
   - **Password**: your-app-password

### Row Level Security (RLS)

The schema includes RLS policies:
- Users can only access their own data
- Email domain restriction to @purdue.edu
- Secure API access patterns

### Database Triggers

Automatic triggers handle:
- User profile creation on signup
- Email verification status sync
- Updated timestamp management

## 🐛 Troubleshooting

### Common Issues

#### Email Not Sending
1. Check SMTP configuration
2. Verify redirect URLs
3. Check spam/junk folders
4. Ensure email confirmations are enabled

#### Verification Link Issues
1. Check site URL configuration
2. Verify redirect URLs include verification page
3. Ensure proper URL formatting

#### Database Connection
1. Verify environment variables
2. Check Supabase project status
3. Review database schema setup

#### @purdue.edu Restriction
The system enforces @purdue.edu email addresses:
- Frontend validation in registration form
- Backend validation in Supabase triggers
- Database constraint in users table

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

Console logs will show:
- 🔐 Authentication attempts
- ✅ Successful operations  
- ❌ Error details
- 📧 Email verification steps

## 📋 Security Checklist

- [ ] RLS policies enabled
- [ ] @purdue.edu domain restriction active
- [ ] HTTPS in production
- [ ] Secure environment variables
- [ ] Email verification required
- [ ] Strong password requirements
- [ ] Session security configured

## 🚀 Production Deployment

### Pre-deployment
1. Update site URLs to production domain
2. Configure production SMTP
3. Test email delivery
4. Verify all redirect URLs
5. Enable security features

### Post-deployment  
1. Test full authentication flow
2. Monitor error logs
3. Verify email delivery
4. Check user registration metrics

## 📞 Support

For issues with this setup:
1. Check Supabase dashboard logs
2. Review browser console errors
3. Verify email provider settings
4. Test with development bypass mode

Remember: The authentication system is designed specifically for Purdue University students, faculty, and staff with @purdue.edu email addresses.
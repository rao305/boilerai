# Microsoft Authentication Setup for Purdue

This guide will help you set up real Microsoft authentication for Purdue students using Azure AD.

## Prerequisites
- Access to Azure Portal (you need to register an app)
- Purdue email account (@purdue.edu)

## Step 1: Azure App Registration

1. **Go to Azure Portal**: https://portal.azure.com/
2. **Navigate to**: Azure Active Directory → App registrations → New registration
3. **Fill out the form**:
   - **Name**: `BoilerAI - Purdue Academic Planner`
   - **Supported account types**: `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`
   - **Redirect URI**: 
     - Type: `Web`
     - URI: `http://localhost:3000` (for development)

## Step 2: Configure Authentication

1. **After creating the app, go to**: Authentication
2. **Add platform** → Web
3. **Redirect URIs**:
   - `http://localhost:3000`
   - `http://localhost:3000/`
4. **Logout URL**: `http://localhost:3000/logout`
5. **Implicit grant and hybrid flows**: Check both boxes
   - ✅ Access tokens
   - ✅ ID tokens

## Step 3: API Permissions

1. **Go to**: API permissions
2. **Add permission** → Microsoft Graph → Delegated permissions
3. **Select these permissions**:
   - `openid`
   - `profile` 
   - `User.Read`
   - `email`
4. **Grant admin consent** for your organization (if you have admin rights)

## Step 4: Get Your Configuration

1. **Go to**: Overview
2. **Copy these values**:
   - **Application (client) ID** → This is your `VITE_AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → This is your `VITE_AZURE_TENANT_ID`

## Step 5: Environment Configuration

Create a `.env` file in your project root:

```env
# Microsoft Azure AD Configuration
VITE_AZURE_CLIENT_ID=your-client-id-here
VITE_AZURE_TENANT_ID=your-tenant-id-here
```

## Step 6: Test the Authentication

1. **Start your app**: `npm run dev`
2. **Go to**: http://localhost:3000
3. **Click**: "Sign in with Purdue Microsoft"
4. **You should be redirected to**: Microsoft login page
5. **Sign in with your @purdue.edu account**
6. **Grant permissions** when prompted
7. **You should be redirected back** to your app

## Troubleshooting

### Common Issues:

1. **"AADSTS50011: The reply URL specified in the request does not match..."**
   - Make sure your redirect URI in Azure matches exactly: `http://localhost:3000`

2. **"AADSTS700016: Application not found in directory"**
   - Check your `VITE_AZURE_CLIENT_ID` is correct
   - Make sure the app registration is in the right tenant

3. **"AADSTS65001: The user or administrator has not consented..."**
   - Go to API permissions in Azure and grant admin consent
   - Or complete the user consent flow

4. **"Access token not valid"**
   - Check that your scopes are correct
   - Verify the `VITE_AZURE_TENANT_ID` is correct

### For Purdue-specific Setup:

If you're setting this up specifically for Purdue University:
- **Tenant ID**: You might need to use Purdue's specific tenant ID
- **Contact Purdue IT**: They may have specific requirements for student applications
- **Multi-tenant vs Single-tenant**: Purdue might require single-tenant configuration

## Production Setup

For production deployment:
1. Update redirect URIs to include your production domain
2. Add production URLs to CORS settings
3. Consider using Azure Key Vault for secrets
4. Set up proper monitoring and logging

## Current Status

✅ Development bypasses removed  
✅ Real Microsoft OAuth flow implemented  
✅ Token validation and refresh  
✅ Purdue email validation  
❌ Azure app registration needed  
❌ Environment variables needed  

## Next Steps

1. Register your Azure application
2. Add the environment variables
3. Test with your real Purdue email
4. Update redirect URIs for production
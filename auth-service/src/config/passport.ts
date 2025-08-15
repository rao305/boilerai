import passport from 'passport';
import { OIDCStrategy } from 'passport-azure-ad';
import type { Request } from 'express';
import { prisma } from './database';
import { env } from './env';
import logger from '../utils/logger';
import { validatePurdueUser, normalizeEmail } from '../utils/validation';
import { createAuditLog } from '../services/auditService';

// Azure AD OIDC Strategy Configuration
const oidcConfig = {
  identityMetadata: env.AZURE_TENANT_ID 
    ? `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/v2.0/.well-known/openid_configuration`
    : 'https://login.microsoftonline.com/common/v2.0/.well-known/openid_configuration',
  clientID: env.AZURE_CLIENT_ID,
  clientSecret: env.AZURE_CLIENT_SECRET,
  responseType: 'code',
  responseMode: 'form_post',
  redirectUrl: `${process.env['BASE_URL'] || 'http://localhost:4000'}/auth/azure/callback`,
  allowHttpForRedirectUrl: env.NODE_ENV === 'development',
  scope: ['openid', 'profile', 'email', 'offline_access'],
  useCookieInsteadOfSession: true,
  cookieEncryptionKeys: [
    { key: env.SESSION_SECRET.slice(0, 32), iv: env.SESSION_SECRET.slice(32, 44) }
  ],
  clockSkew: 300, // 5 minutes clock skew tolerance
  loggingLevel: env.NODE_ENV === 'development' ? 'info' : 'error',
  nonceLifetime: 3600, // 1 hour
  nonceMaxAmount: 5,
  passReqToCallback: true
};

// Passport Azure AD Strategy
passport.use('azure-ad', new OIDCStrategy(oidcConfig, async (
  req: Request,
  iss: string,
  sub: string,
  profile: any,
  accessToken: string,
  refreshToken: string,
  done: any
) => {
  try {
    logger.info('Azure AD authentication callback started', {
      sub,
      iss,
      email: profile._json?.email || profile._json?.preferred_username,
      upn: profile._json?.upn
    });

    // Validate Purdue user
    const validation = await validatePurdueUser(profile, iss);
    if (!validation.isValid) {
      logger.warn('Authentication rejected - not a valid Purdue user', {
        sub,
        email: profile._json?.email,
        reason: validation.reason
      });

      // Create audit log for failed authentication
      await createAuditLog({
        action: 'failed_login',
        details: {
          provider: 'azure-ad',
          reason: validation.reason,
          email: profile._json?.email || profile._json?.preferred_username,
          tenant_id: profile._json?.tid
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: false
      });

      return done(new Error('Access denied'), null);
    }

    const email = validation.email!;
    const normalizedEmail = normalizeEmail(email);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { emailNormalized: normalizedEmail },
      include: { profile: true }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          emailNormalized: normalizedEmail,
          name: profile.displayName || profile._json?.name,
          image: profile._json?.picture,
          emailVerified: new Date(),
          azureId: sub,
          tenantId: profile._json?.tid,
          upn: profile._json?.upn || profile._json?.preferred_username,
          lastLoginAt: new Date(),
          profile: {
            create: {
              displayName: profile.displayName || profile._json?.name,
              role: 'student' // Default role, can be updated later
            }
          }
        },
        include: { profile: true }
      });

      logger.info('New user created', {
        userId: user.id,
        email: user.email,
        azureId: user.azureId
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.displayName || profile._json?.name || user.name,
          image: profile._json?.picture || user.image,
          azureId: sub,
          tenantId: profile._json?.tid,
          upn: profile._json?.upn || profile._json?.preferred_username,
          lastLoginAt: new Date()
        },
        include: { profile: true }
      });

      logger.info('Existing user updated', {
        userId: user.id,
        email: user.email,
        azureId: user.azureId
      });
    }

    // Create or update account record
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'azure-ad',
          providerAccountId: sub
        }
      },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'azure-ad',
        providerAccountId: sub,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        token_type: 'Bearer',
        scope: 'openid profile email offline_access',
        id_token: (req as any).body?.id_token || null,
        tenant_id: profile._json?.tid
      },
      update: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        id_token: (req as any).body?.id_token || null,
        tenant_id: profile._json?.tid,
        updatedAt: new Date()
      }
    });

    // Create audit log for successful authentication
    await createAuditLog({
      userId: user.id,
      action: 'login',
      details: {
        provider: 'azure-ad',
        azureId: sub,
        tenant_id: profile._json?.tid
      },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') as string,
      success: true
    });

    logger.info('Azure AD authentication successful', {
      userId: user.id,
      email: user.email,
      azureId: user.azureId
    });

    return done(null, user as any);

  } catch (error) {
    logger.error('Azure AD authentication error:', error);

    // Create audit log for authentication error
    await createAuditLog({
      action: 'auth_error',
      details: {
        provider: 'azure-ad',
        error: error instanceof Error ? error.message : 'Unknown error',
        email: profile._json?.email || profile._json?.preferred_username
      },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') as string,
      success: false
    });

    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true }
    });

    if (!user) {
      return done(new Error('User not found'), null);
    }

    done(null, user as any);
  } catch (error) {
    logger.error('User deserialization error:', error);
    done(error, null);
  }
});

export default passport;
import { Router, Request, Response, NextFunction } from 'express';
import passport from '../config/passport';
import { env } from '../config/env';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';
import { validateStateParameter, noCache } from '../middleware/security';
import { rateLimit } from '../middleware/rateLimit';
import logger from '../utils/logger';
import { isValidRedirectUrl } from '../utils/validation';

const router = Router();

/**
 * GET /auth/status - Check authentication status
 */
router.get('/status', optionalAuth, (req: Request, res: Response) => {
  if (req.isAuthenticated() && req.user) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        image: req.user.image,
        role: req.user.profile?.role || 'student',
        department: req.user.profile?.department,
        lastLoginAt: req.user.lastLoginAt
      }
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

/**
 * GET /auth/signin - Show sign-in page
 */
router.get('/signin', noCache, (req: Request, res: Response) => {
  // If already authenticated, redirect to dashboard or return URL
  if (req.isAuthenticated()) {
    const returnUrl = (req.query as any)['returnUrl'] as string;
    const redirectUrl = returnUrl && isValidRedirectUrl(returnUrl, env.ALLOWED_ORIGINS) 
      ? returnUrl 
      : '/dashboard';
    
    return res.redirect(redirectUrl);
  }

  // Store return URL in session
  const returnUrl = (req.query as any)['returnUrl'] as string;
  if (returnUrl && isValidRedirectUrl(returnUrl, env.ALLOWED_ORIGINS)) {
    (req.session as any).returnUrl = returnUrl;
  }

  // Render sign-in page
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in - Purdue University</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #DAA520 0%, #B8860B 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333;
            }
            
            .signin-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                padding: 3rem;
                max-width: 400px;
                width: 100%;
                margin: 1rem;
            }
            
            .logo {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .logo h1 {
                color: #DAA520;
                font-size: 1.8rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
            }
            
            .logo p {
                color: #666;
                font-size: 0.9rem;
            }
            
            .signin-button {
                width: 100%;
                background: #0078d4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 1rem 1.5rem;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                text-decoration: none;
                margin-bottom: 1.5rem;
            }
            
            .signin-button:hover {
                background: #106ebe;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
            }
            
            .signin-button:active {
                transform: translateY(0);
            }
            
            .microsoft-icon {
                width: 20px;
                height: 20px;
            }
            
            .fallback-section {
                border-top: 1px solid #e5e5e5;
                padding-top: 1.5rem;
                text-align: center;
                display: ${env.FALLBACK_MAGIC_LINK ? 'block' : 'none'};
            }
            
            .fallback-text {
                color: #666;
                font-size: 0.85rem;
                margin-bottom: 1rem;
            }
            
            .fallback-link {
                color: #DAA520;
                text-decoration: none;
                font-size: 0.9rem;
                font-weight: 500;
            }
            
            .fallback-link:hover {
                text-decoration: underline;
            }
            
            .security-notice {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 1rem;
                margin-top: 1.5rem;
                font-size: 0.8rem;
                color: #666;
                text-align: center;
            }
            
            .error-message {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 1rem;
                border-radius: 6px;
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
                text-align: center;
            }
            
            @media (max-width: 480px) {
                .signin-container {
                    padding: 2rem 1.5rem;
                    margin: 0.5rem;
                }
                
                .logo h1 {
                    font-size: 1.5rem;
                }
            }
        </style>
    </head>
    <body>
        <div class="signin-container">
            <div class="logo">
                <h1>🚀 Purdue Auth</h1>
                <p>Secure authentication for Purdue University</p>
            </div>
            
            ${req.query.error ? `
                <div class="error-message">
                    ${req.query.error === 'access_denied' ? 
                        'Access denied. Only Purdue University accounts are allowed.' :
                        'Authentication failed. Please try again.'
                    }
                </div>
            ` : ''}
            
            <a href="/auth/azure" class="signin-button" role="button">
                <svg class="microsoft-icon" viewBox="0 0 23 23" fill="currentColor">
                    <path d="M1 1h10v10H1z" fill="#f25022"/>
                    <path d="M12 1h10v10H12z" fill="#00a4ef"/>
                    <path d="M1 12h10v10H1z" fill="#ffb900"/>
                    <path d="M12 12h10v10H12z" fill="#7fba00"/>
                </svg>
                Sign in with Purdue (Microsoft)
            </a>
            
            <div class="fallback-section">
                <div class="fallback-text">
                    Microsoft sign-in temporarily unavailable?
                </div>
                <a href="/auth/magic-link" class="fallback-link">
                    Email me a sign-in link
                </a>
            </div>
            
            <div class="security-notice">
                🔒 This is a secure Purdue University authentication service. Only @purdue.edu accounts are permitted.
            </div>
        </div>
    </body>
    </html>
  `);
});

/**
 * GET /auth/azure - Initiate Azure AD authentication
 */
router.get('/azure', 
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many sign-in attempts. Please try again later.' }
  }),
  (req: Request, res: Response, next: NextFunction) => {
    // Generate and store state parameter for CSRF protection
    const state = require('crypto').randomBytes(32).toString('hex');
    req.session.oauthState = state;
    
    // Add state to OAuth parameters
    passport.authenticate('azure-ad', {
      state,
      prompt: 'login'
    } as any)(req, res, next);
  }
);

/**
 * POST /auth/azure/callback - Azure AD callback
 */
router.post('/azure/callback',
  validateStateParameter,
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Higher limit for callbacks
    message: { error: 'Too many callback attempts. Please try again later.' }
  }),
  passport.authenticate('azure-ad', {
    failureRedirect: '/auth/signin?error=authentication_failed'
  }),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        logger.error('No user found after successful authentication');
        return res.redirect('/auth/signin?error=authentication_failed');
      }

      logger.info('User authenticated successfully', {
        userId: req.user.id,
        email: req.user.email,
        ip: req.ip
      });

      // Create success audit log
      await createAuditLog({
        userId: req.user.id,
        action: 'login',
        details: {
          provider: 'azure-ad',
          ip: req.ip,
          userAgent: req.get('User-Agent') as string
        },
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') as string,
        success: true
      });

      // Redirect to return URL or dashboard
      const returnUrl = (req.session as any).returnUrl;
      delete (req.session as any).returnUrl;

      const redirectUrl = returnUrl && isValidRedirectUrl(returnUrl, env.ALLOWED_ORIGINS)
        ? returnUrl
        : '/dashboard';

      res.redirect(redirectUrl);

    } catch (error) {
      logger.error('Error in authentication callback:', error);
      res.redirect('/auth/signin?error=authentication_failed');
    }
  }
);

/**
 * POST /auth/logout - Sign out
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Create audit log
    await createAuditLog({
      userId: userId,
      action: 'logout',
      details: {
        ip: req.ip,
        userAgent: req.get('User-Agent') as string
      },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') as string,
      success: true
    });

    // Logout from Passport session
    req.logout((err) => {
      if (err) {
        logger.error('Error during logout:', err);
        return res.status(500).json({
          error: 'Logout failed',
          message: 'Please try again'
        });
      }

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session:', err);
        }

        // Clear the session cookie set in server.ts
        res.clearCookie('__Secure-auth.sid', {
          httpOnly: true,
          sameSite: 'lax',
          secure: env.NODE_ENV === 'production',
          path: '/'
        });
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      });
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Please try again'
    });
  }
});

/**
 * GET /auth/user - Get current user info
 */
router.get('/user', requireAuth, (req: Request, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      image: req.user!.image,
      role: req.user!.profile?.role || 'student',
      department: req.user!.profile?.department,
      year: req.user!.profile?.year,
      lastLoginAt: req.user!.lastLoginAt,
      createdAt: req.user!.createdAt
    }
  });
});

export default router;
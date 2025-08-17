import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { env } from '../config/env';
import { rateLimit } from '../middleware/rateLimit';
import { noCache } from '../middleware/security';
import magicLinkService from '../services/magicLinkService';
import { createAuditLog } from '../services/auditService';
import logger from '../utils/logger';

const router = Router();

/**
 * Check if magic link feature is enabled
 */
function checkMagicLinkEnabled(req: Request, res: Response, next: any) {
  if (!env.FALLBACK_MAGIC_LINK) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Magic link authentication is not available'
    });
  }
  return next();
}

/**
 * GET /auth/magic-link - Show magic link request page
 */
router.get('/magic-link', checkMagicLinkEnabled, noCache, (req: Request, res: Response) => {
  // If already authenticated, redirect
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Sign-in - Purdue Auth</title>
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
            
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            .form-label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 500;
                color: #333;
            }
            
            .form-input {
                width: 100%;
                padding: 1rem;
                border: 2px solid #e5e5e5;
                border-radius: 6px;
                font-size: 1rem;
                transition: border-color 0.2s ease;
            }
            
            .form-input:focus {
                outline: none;
                border-color: #DAA520;
            }
            
            .submit-button {
                width: 100%;
                background: #DAA520;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 1rem 1.5rem;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-bottom: 1.5rem;
            }
            
            .submit-button:hover {
                background: #B8860B;
                transform: translateY(-1px);
            }
            
            .submit-button:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
            }
            
            .back-link {
                text-align: center;
                margin-bottom: 1.5rem;
            }
            
            .back-link a {
                color: #0078d4;
                text-decoration: none;
                font-size: 0.9rem;
            }
            
            .back-link a:hover {
                text-decoration: underline;
            }
            
            .warning-box {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 6px;
                padding: 1rem;
                margin-bottom: 1.5rem;
                font-size: 0.85rem;
                color: #856404;
            }
            
            .error-message {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 1rem;
                border-radius: 6px;
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
            }
            
            .success-message {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 1rem;
                border-radius: 6px;
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
            }
            
            .loading {
                display: none;
                text-align: center;
                color: #666;
                margin-top: 1rem;
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
                <h1>📧 Email Sign-in</h1>
                <p>Backup sign-in for Purdue University</p>
            </div>
            
            <div class="back-link">
                <a href="/auth/signin">← Back to main sign-in</a>
            </div>
            
            <div class="warning-box">
                ⚠️ <strong>Backup Method Only</strong><br>
                This is a fallback when Microsoft sign-in is unavailable. Use the main sign-in method when possible.
            </div>
            
            <div id="error-container"></div>
            <div id="success-container"></div>
            
            <form id="magic-link-form">
                <div class="form-group">
                    <label for="email" class="form-label">Purdue Email Address</label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        class="form-input" 
                        placeholder="your.name@purdue.edu"
                        required
                        pattern=".*@purdue\\.edu$"
                    >
                </div>
                
                <button type="submit" class="submit-button" id="submit-btn">
                    📧 Email me a sign-in link
                </button>
                
                <div class="loading" id="loading">
                    Sending email...
                </div>
            </form>
            
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 1rem; font-size: 0.8rem; color: #666; text-align: center;">
                🔒 Only @purdue.edu emails are accepted. The sign-in link expires in 10 minutes.
            </div>
        </div>

        <script>
            document.getElementById('magic-link-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const submitBtn = document.getElementById('submit-btn');
                const loading = document.getElementById('loading');
                const errorContainer = document.getElementById('error-container');
                const successContainer = document.getElementById('success-container');
                
                // Clear previous messages
                errorContainer.textContent = '';
                successContainer.textContent = '';
                
                // Validate email
                if (!email.endsWith('@purdue.edu')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = 'Please enter a valid @purdue.edu email address.';
                    errorContainer.appendChild(errorDiv);
                    return;
                }
                
                // Show loading state
                submitBtn.disabled = true;
                loading.style.display = 'block';
                
                try {
                    const response = await fetch('/auth/magic-link/request', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        const successDiv = document.createElement('div');
                        successDiv.className = 'success-message';
                        successDiv.textContent = '✅ Check your email! We sent you a sign-in link that expires in 10 minutes.';
                        successContainer.appendChild(successDiv);
                        document.getElementById('magic-link-form').style.display = 'none';
                    } else {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'error-message';
                        errorDiv.textContent = data.error || 'Failed to send email. Please try again.';
                        errorContainer.appendChild(errorDiv);
                    }
                } catch (error) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = 'Network error. Please try again.';
                    errorContainer.appendChild(errorDiv);
                } finally {
                    submitBtn.disabled = false;
                    loading.style.display = 'none';
                }
            });
        </script>
    </body>
    </html>
  `);
});

/**
 * POST /auth/magic-link/request - Request magic link
 */
router.post('/magic-link/request',
  checkMagicLinkEnabled,
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requests per window per IP
    message: { error: 'Too many magic link requests. Please try again later.' }
  }),
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .custom((value) => {
        if (!value.endsWith('@purdue.edu')) {
          throw new Error('Only @purdue.edu email addresses are allowed');
        }
        return true;
      })
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0]?.msg || 'Invalid input'
        });
      }

      const { email } = req.body;

      // Create magic link
      const result = await magicLinkService.createMagicLink({
        email,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent')
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'If that email is associated with a Purdue account, we sent you a sign-in link.'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Magic link request error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /auth/magic-link/verify - Verify magic link token
 */
router.get('/magic-link/verify',
  checkMagicLinkEnabled,
  noCache,
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 attempts per window
    message: { error: 'Too many verification attempts. Please try again later.' }
  }),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.redirect('/auth/signin?error=invalid_token');
      }

      // Validate magic link
      const validation = await magicLinkService.validateMagicLink(token, req.ip);

      if (!validation.isValid) {
        logger.warn('Magic link validation failed', {
          token: token.substring(0, 8) + '...',
          error: validation.error,
          ip: req.ip
        });

        return res.redirect(`/auth/signin?error=${encodeURIComponent(validation.error || 'invalid_token')}`);
      }

      // Log the user in
      req.login(validation.user, (err) => {
        if (err) {
          logger.error('Magic link login error:', err);
          return res.redirect('/auth/signin?error=login_failed');
        }

        logger.info('Magic link login successful', {
          userId: validation.user!.id,
          email: validation.user!.email,
          ip: req.ip
        });

        // Redirect to dashboard or return URL
        const returnUrl = (req.session as any).returnUrl;
        delete (req.session as any).returnUrl;

        res.redirect(returnUrl || '/dashboard');
      });

    } catch (error) {
      logger.error('Magic link verification error:', error);
      res.redirect('/auth/signin?error=verification_failed');
    }
  }
);

export default router;
import { env } from '../config/env';
import logger from './logger';

// Known Purdue email domains
const PURDUE_DOMAINS = [
  'purdue.edu',
  'student.purdue.edu'
];

// Purdue tenant ID (if known)
const PURDUE_TENANT_ID = env.AZURE_TENANT_ID;

export interface ValidationResult {
  isValid: boolean;
  email?: string;
  reason?: string;
}

/**
 * Validates if a user is from Purdue University
 */
export async function validatePurdueUser(profile: any, issuer: string): Promise<ValidationResult> {
  try {
    // Extract email from profile
    const email = profile._json?.email || profile._json?.preferred_username || profile._json?.upn;
    
    if (!email) {
      return {
        isValid: false,
        reason: 'No email found in profile'
      };
    }

    const normalizedEmail = normalizeEmail(email);
    
    // Check if email domain is from Purdue
    const domain = normalizedEmail.split('@')[1] || '';
    if (!PURDUE_DOMAINS.includes(domain)) {
      return {
        isValid: false,
        reason: `Email domain ${domain} is not a Purdue domain`
      };
    }

    // If we have a specific tenant ID, validate against it
    if (PURDUE_TENANT_ID) {
      const tenantId = profile._json?.tid;
      if (tenantId !== PURDUE_TENANT_ID) {
        logger.warn('Tenant ID mismatch', {
          expected: PURDUE_TENANT_ID,
          received: tenantId,
          email: normalizedEmail
        });
        // If the claim shows common consumer tenant, treat as external
        return {
          isValid: false,
          reason: tenantId === '9188040d-6c67-4c5b-b112-36a304b66dad' ? 'External account not allowed' : 'Invalid tenant'
        };
      }
    } else {
      // If no specific tenant ID, validate issuer and claims
      const tenantId = profile._json?.tid;
      
      // Check if issuer matches expected pattern for Purdue tenant
      if (tenantId && !issuer.includes(tenantId)) {
        return {
          isValid: false,
          reason: 'Issuer does not match tenant'
        };
      }

      // Additional validation for external accounts with Purdue email
      // Check if this is actually a Purdue tenant vs external account with @purdue.edu alias
      if (!tenantId || tenantId === '9188040d-6c67-4c5b-b112-36a304b66dad') { // Common consumer tenant
        logger.warn('Possible external account with Purdue email detected', {
          email: normalizedEmail,
          tenantId,
          issuer
        });
        return {
          isValid: false,
          reason: 'External account not allowed'
        };
      }
    }

    // Validate user principal name if available
    const upn = profile._json?.upn;
    if (upn && !upn.endsWith('@purdue.edu')) {
      return {
        isValid: false,
        reason: 'UPN does not match Purdue domain'
      };
    }

    logger.info('Purdue user validation successful', {
      email: normalizedEmail,
      tenantId: profile._json?.tid,
      upn: profile._json?.upn
    });

    return {
      isValid: true,
      email: normalizedEmail
    };

  } catch (error) {
    logger.error('Error validating Purdue user:', error);
    return {
      isValid: false,
      reason: 'Validation error'
    };
  }
}

/**
 * Normalizes email address (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if email is from Purdue domain
 */
export function isPurdueEmail(email: string): boolean {
  const normalizedEmail = normalizeEmail(email);
  const domain = normalizedEmail.split('@')[1] || '';
  return PURDUE_DOMAINS.includes(domain);
}

/**
 * Validates password strength (for fallback auth if enabled)
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input.replace(/[<>\"']/g, '');
}

/**
 * Validates redirect URL to prevent open redirects
 */
export function isValidRedirectUrl(url: string, allowedOrigins: string[]): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Check against allowed origins
    const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
    return allowedOrigins.includes(origin);
    
  } catch (error) {
    // Invalid URL
    return false;
  }
}
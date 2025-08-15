import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { sendMagicLinkEmail } from './emailService';
import { createAuditLog } from './auditService';
import { normalizeEmail, isPurdueEmail } from '../utils/validation';
import logger from '../utils/logger';

export interface MagicLinkRequest {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface MagicLinkValidation {
  isValid: boolean;
  user?: any;
  error?: string;
}

/**
 * Generate a secure magic link token
 */
function generateMagicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create and send magic link
 */
export async function createMagicLink(request: MagicLinkRequest): Promise<{ success: boolean; error?: string }> {
  if (!env.FALLBACK_MAGIC_LINK) {
    return { success: false, error: 'Magic link authentication is disabled' };
  }

  try {
    const { email, ipAddress, userAgent } = request;
    const normalizedEmail = normalizeEmail(email);

    // Validate email domain
    if (!isPurdueEmail(normalizedEmail)) {
      logger.warn('Magic link requested for non-Purdue email', {
        email: normalizedEmail,
        ip: ipAddress
      });

      await createAuditLog({
        action: 'magic_link_denied',
        details: {
          email: normalizedEmail,
          reason: 'non_purdue_email'
        },
        ipAddress,
        userAgent,
        success: false
      });

      return { success: false, error: 'Only Purdue University emails are allowed' };
    }

    // Check rate limiting - max 3 magic links per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLinks = await prisma.magicLink.count({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    if (recentLinks >= 3) {
      logger.warn('Magic link rate limit exceeded', {
        email: normalizedEmail,
        recentLinks,
        ip: ipAddress
      });

      await createAuditLog({
        action: 'magic_link_rate_limited',
        details: {
          email: normalizedEmail,
          recentLinks
        },
        ipAddress,
        userAgent,
        success: false
      });

      return { success: false, error: 'Too many magic link requests. Please try again later.' };
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { emailNormalized: normalizedEmail }
    });

    if (!user) {
      // Create new user for magic link
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          emailNormalized: normalizedEmail,
          emailVerified: new Date(),
          profile: {
            create: {
              role: 'student'
            }
          }
        }
      });

      logger.info('New user created via magic link', {
        userId: user.id,
        email: normalizedEmail
      });
    }

    // Generate magic link token
    const token = generateMagicToken();
    const expiresInMs = parseInt(env.MAGIC_LINK_EXPIRES_IN.replace('m', '')) * 60 * 1000;
    const expires = new Date(Date.now() + expiresInMs);

    // Create magic link record
    await prisma.magicLink.create({
      data: {
        userId: user.id,
        token,
        email: normalizedEmail,
        expires,
        ipAddress: ipAddress ?? null
      }
    });

    // Generate magic link URL
    const baseUrl = process.env['BASE_URL'] || 'http://localhost:4000';
    const magicLink = `${baseUrl}/auth/magic-link/verify?token=${token}`;

    // Send email
    const emailSent = await sendMagicLinkEmail(
      normalizedEmail,
      magicLink,
      Math.floor(expiresInMs / 60000) // Convert to minutes
    );

    if (!emailSent) {
      // Clean up magic link if email failed
      await prisma.magicLink.deleteMany({
        where: { token }
      });

      logger.error('Failed to send magic link email', {
        email: normalizedEmail,
        userId: user.id
      });

      return { success: false, error: 'Failed to send email. Please try again.' };
    }

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'magic_link_sent',
      details: {
        email: normalizedEmail
      },
      ipAddress: ipAddress ?? '',
      userAgent: userAgent as string,
      success: true
    });

    logger.info('Magic link sent successfully', {
      userId: user.id,
      email: normalizedEmail,
      expires: expires.toISOString()
    });

    return { success: true };

  } catch (error) {
    logger.error('Error creating magic link:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Validate and consume magic link token
 */
export async function validateMagicLink(token: string, ipAddress?: string): Promise<MagicLinkValidation> {
  if (!env.FALLBACK_MAGIC_LINK) {
    return { isValid: false, error: 'Magic link authentication is disabled' };
  }

  try {
    // Find magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: {
          include: { profile: true }
        }
      }
    });

    if (!magicLink) {
      logger.warn('Invalid magic link token attempted', {
        token: token.substring(0, 8) + '...',
        ip: ipAddress
      });

      await createAuditLog({
        action: 'magic_link_invalid',
        details: {
          token: token.substring(0, 8) + '...'
        },
        ipAddress: ipAddress ?? '',
        success: false
      });

      return { isValid: false, error: 'Invalid or expired magic link' };
    }

    // Check if already used
    if (magicLink.used) {
      logger.warn('Attempted reuse of magic link', {
        token: token.substring(0, 8) + '...',
        userId: magicLink.userId,
        originalUse: magicLink.usedAt,
        ip: ipAddress
      });

      await createAuditLog({
        userId: magicLink.userId,
        action: 'magic_link_reuse',
        details: {
          token: token.substring(0, 8) + '...',
          originalUse: magicLink.usedAt
        },
        ipAddress: ipAddress ?? '',
        success: false
      });

      return { isValid: false, error: 'Magic link has already been used' };
    }

    // Check if expired
    if (new Date() > magicLink.expires) {
      logger.warn('Expired magic link attempted', {
        token: token.substring(0, 8) + '...',
        userId: magicLink.userId,
        expired: magicLink.expires,
        ip: ipAddress
      });

      // Clean up expired link
      await prisma.magicLink.delete({
        where: { id: magicLink.id }
      });

      await createAuditLog({
        userId: magicLink.userId,
        action: 'magic_link_expired',
        details: {
          token: token.substring(0, 8) + '...',
          expired: magicLink.expires
        },
        ipAddress: ipAddress ?? '',
        success: false
      });

      return { isValid: false, error: 'Magic link has expired' };
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    // Update user last login
    await prisma.user.update({
      where: { id: magicLink.userId },
      data: {
        lastLoginAt: new Date()
      }
    });

    // Create audit log
    await createAuditLog({
      userId: magicLink.userId,
      action: 'magic_link_login',
      details: {
        email: magicLink.email
      },
      ipAddress: ipAddress ?? '',
      success: true
    });

    logger.info('Magic link login successful', {
      userId: magicLink.userId,
      email: magicLink.email,
      ip: ipAddress
    });

    return {
      isValid: true,
      user: magicLink.user
    };

  } catch (error) {
    logger.error('Error validating magic link:', error);
    return { isValid: false, error: 'Internal server error' };
  }
}

/**
 * Clean up expired magic links
 */
export async function cleanupExpiredMagicLinks(): Promise<number> {
  try {
    const result = await prisma.magicLink.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    });

    logger.info(`Cleaned up ${result.count} expired magic links`);
    return result.count;
  } catch (error) {
    logger.error('Error cleaning up expired magic links:', error);
    return 0;
  }
}

/**
 * Get magic link statistics
 */
export async function getMagicLinkStats(
  startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
) {
  try {
    const [sent, used, expired] = await Promise.all([
      prisma.magicLink.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      prisma.magicLink.count({
        where: {
          used: true,
          usedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      prisma.magicLink.count({
        where: {
          expires: {
            lt: new Date(),
            gte: startDate
          },
          used: false
        }
      })
    ]);

    return {
      sent,
      used,
      expired,
      conversionRate: sent > 0 ? (used / sent) * 100 : 0
    };
  } catch (error) {
    logger.error('Error getting magic link stats:', error);
    return {
      sent: 0,
      used: 0,
      expired: 0,
      conversionRate: 0
    };
  }
}

export default {
  createMagicLink,
  validateMagicLink,
  cleanupExpiredMagicLinks,
  getMagicLinkStats
};
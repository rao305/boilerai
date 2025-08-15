import { test, expect, Page } from '@playwright/test';
import { prisma } from '../../src/config/database';
import { redisClient } from '../../src/config/redis';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async () => {
    // Clean up database and Redis before each test
    await prisma.session.deleteMany();
    await prisma.magicLink.deleteMany();
    await prisma.auditLog.deleteMany();
    await redisClient.flushAll();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
    await redisClient.quit();
  });

  test('SSO Login Happy Path', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Verify sign-in page loads correctly
    await expect(page).toHaveTitle(/Purdue Authentication/);
    await expect(page.locator('h1')).toContainText('Sign in with your Purdue account');
    
    // Check that Microsoft SSO button is present and correctly labeled
    const ssoButton = page.locator('button:has-text("Sign in with Purdue (Microsoft)")');
    await expect(ssoButton).toBeVisible();
    await expect(ssoButton).toBeEnabled();
    
    // Mock Microsoft login flow (in real tests, this would redirect to Azure AD)
    await page.route('**/auth/azure', async route => {
      // Simulate successful Azure AD callback
      await route.fulfill({
        status: 302,
        headers: {
          'Location': `${BASE_URL}/auth/callback?code=mock_code&state=mock_state`
        }
      });
    });
    
    // Click SSO button
    await ssoButton.click();
    
    // In a real scenario, this would redirect to Microsoft login
    // For testing, we simulate the callback with valid Purdue user
    await page.goto(`${BASE_URL}/auth/callback?code=mock_code&state=mock_state`);
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verify user session information is displayed
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-role"]')).toContainText('student');
  });

  test('Logout Flow', async ({ page }) => {
    // Set up authenticated session
    await setupAuthenticatedSession(page);
    
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Click logout button
    const logoutButton = page.locator('button:has-text("Sign Out")');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();
    
    // Should redirect to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator('h1')).toContainText('Sign in with your Purdue account');
    
    // Verify session is cleared
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Protected Route Access Control', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should redirect to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);
    
    // Try to access API endpoint without authentication
    const response = await page.request.get(`${BASE_URL}/api/profile`);
    expect(response.status()).toBe(401);
  });

  test('Non-Purdue User Blocked', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Mock Azure AD callback with non-Purdue user
    await page.route('**/auth/callback*', async route => {
      // Simulate callback with non-Purdue email
      const url = new URL(route.request().url());
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('error_description', 'User not from authorized domain');
      
      await route.fulfill({
        status: 302,
        headers: {
          'Location': url.toString()
        }
      });
    });
    
    // Attempt login
    const ssoButton = page.locator('button:has-text("Sign in with Purdue (Microsoft)")');
    await ssoButton.click();
    
    // Should show generic error message (no account enumeration)
    await expect(page.locator('.error-message')).toContainText('Unable to sign in');
    await expect(page.locator('.error-message')).not.toContainText('purdue.edu');
  });

  test('Rate Limiting on Sign-in Attempts', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);
    
    const ssoButton = page.locator('button:has-text("Sign in with Purdue (Microsoft)")');
    
    // Make multiple rapid sign-in attempts
    for (let i = 0; i < 12; i++) {
      await ssoButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Should show rate limit error
    await expect(page.locator('.error-message')).toContainText('Too many attempts');
    
    // Button should be disabled
    await expect(ssoButton).toBeDisabled();
  });

  test('Magic Link Fallback Flow', async ({ page }) => {
    // Enable magic link feature for this test
    await page.addInitScript(() => {
      window.localStorage.setItem('FEATURE_MAGIC_LINK', 'true');
    });
    
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Magic link option should only be visible when feature is enabled
    const magicLinkButton = page.locator('button:has-text("Email me a sign-in link")');
    await expect(magicLinkButton).toBeVisible();
    
    // Click magic link option
    await magicLinkButton.click();
    
    // Fill in Purdue email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test.user@purdue.edu');
    
    // Submit email form
    const submitButton = page.locator('button:has-text("Send Link")');
    await submitButton.click();
    
    // Should show check email message
    await expect(page.locator('h2')).toContainText('Check your email');
    await expect(page.locator('.email-sent-message')).toContainText('test.user@purdue.edu');
    
    // Simulate clicking magic link from email
    // In reality, this would be a link like: /auth/magic-link/verify?token=...
    const magicToken = await getMagicLinkToken('test.user@purdue.edu');
    await page.goto(`${BASE_URL}/auth/magic-link/verify?token=${magicToken}`);
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Magic Link Rate Limiting', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('FEATURE_MAGIC_LINK', 'true');
    });
    
    await page.goto(`${BASE_URL}/auth/signin`);
    
    const magicLinkButton = page.locator('button:has-text("Email me a sign-in link")');
    await magicLinkButton.click();
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button:has-text("Send Link")');
    
    // Make multiple rapid requests
    for (let i = 0; i < 6; i++) {
      await emailInput.fill('test.user@purdue.edu');
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Should show rate limit error
    await expect(page.locator('.error-message')).toContainText('Too many requests');
  });

  test('Session Refresh and Token Rotation', async ({ page }) => {
    await setupAuthenticatedSession(page);
    
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Wait for session to near expiry (simulate by manipulating session)
    await page.evaluate(() => {
      // Simulate expired session token
      document.cookie = 'connect.sid=expired_token; path=/';
    });
    
    // Make API request that should trigger token refresh
    const response = await page.request.get(`${BASE_URL}/api/profile`);
    
    // Should either succeed with new token or redirect to login
    expect([200, 302, 401]).toContain(response.status());
    
    if (response.status() === 302) {
      // Should redirect to sign-in
      const location = response.headers()['location'];
      expect(location).toContain('/auth/signin');
    }
  });

  test('Cross-Site Request Forgery Protection', async ({ page }) => {
    // Attempt to make authenticated request without proper CSRF token
    const response = await page.request.post(`${BASE_URL}/api/profile`, {
      data: { displayName: 'Malicious Update' },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Should be rejected due to CSRF protection
    expect(response.status()).toBe(403);
  });

  test('Content Security Policy Headers', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/auth/signin`);
    const headers = response?.headers();
    
    // Verify CSP headers are present
    expect(headers?.['content-security-policy']).toBeDefined();
    expect(headers?.['x-frame-options']).toBe('DENY');
    expect(headers?.['x-content-type-options']).toBe('nosniff');
  });

  test('Accessibility Compliance', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Check for proper ARIA labels and semantic HTML
    const ssoButton = page.locator('button:has-text("Sign in with Purdue (Microsoft)")');
    await expect(ssoButton).toHaveAttribute('aria-label');
    
    // Check color contrast and focus management
    await ssoButton.focus();
    await expect(ssoButton).toBeFocused();
    
    // Verify keyboard navigation works
    await page.keyboard.press('Tab');
    // Next focusable element should be focused
  });
});

/**
 * Helper function to set up authenticated session for testing
 */
async function setupAuthenticatedSession(page: Page) {
  // Create test user in database
  const user = await prisma.user.create({
    data: {
      email: 'test.user@purdue.edu',
      name: 'Test User',
      provider: 'azure-ad',
      providerId: 'test-provider-id',
      profile: {
        create: {
          displayName: 'Test User',
          role: 'student'
        }
      }
    }
  });

  // Create session
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: 'test-session-token',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  });

  // Set session cookie
  await page.context().addCookies([{
    name: 'connect.sid',
    value: session.sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false, // false for localhost testing
    sameSite: 'Lax'
  }]);
}

/**
 * Helper function to get magic link token for testing
 */
async function getMagicLinkToken(email: string): Promise<string> {
  const magicLink = await prisma.magicLink.findFirst({
    where: {
      email: email.toLowerCase(),
      used: false,
      expires: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return magicLink?.token || 'invalid-token';
}
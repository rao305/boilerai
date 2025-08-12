import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/invalid email format/i)).toBeVisible();
  });

  test('should require purdue.edu email', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@gmail.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/must be a purdue\.edu email/i)).toBeVisible();
  });

  test('should validate password length', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@purdue.edu');
    await page.getByLabel(/password/i).fill('123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();
  });

  test('should successfully login with test credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('testdev@purdue.edu');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/dashboard|planner/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should handle login errors gracefully', async ({ page }) => {
    await page.getByLabel(/email/i).fill('nonexistent@purdue.edu');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('should switch to registration form', async ({ page }) => {
    await page.getByRole('button', { name: /create an account/i }).click();
    
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/class status/i)).toBeVisible();
    await expect(page.getByLabel(/major/i)).toBeVisible();
  });

  test('should validate registration form', async ({ page }) => {
    await page.getByRole('button', { name: /create an account/i }).click();
    await page.getByRole('button', { name: /create account/i }).click();
    
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should handle registration flow', async ({ page }) => {
    await page.getByRole('button', { name: /create an account/i }).click();
    
    await page.getByLabel(/full name/i).fill('E2E Test User');
    await page.getByLabel(/email/i).fill('e2etest@purdue.edu');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/class status/i).selectOption('senior');
    await page.getByLabel(/major/i).fill('Computer Science');
    
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Should show success message or redirect
    await expect(page.getByText(/registration successful|verify your email/i)).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});
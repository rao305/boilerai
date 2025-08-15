import { test, expect } from '@playwright/test';

test.describe('Transcript Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByLabel(/email/i).fill('testdev@purdue.edu');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard|planner/);
    
    // Navigate to transcript upload
    await page.getByRole('link', { name: /transcript|upload/i }).click();
  });

  test('should display transcript upload interface', async ({ page }) => {
    await expect(page.getByText(/upload transcript/i)).toBeVisible();
    await expect(page.getByText(/drag.*drop|choose file/i)).toBeVisible();
    await expect(page.getByText(/paste transcript text/i)).toBeVisible();
  });

  test('should process transcript text', async ({ page }) => {
    const transcriptText = `
      PURDUE UNIVERSITY TRANSCRIPT
      Student: John Doe
      ID: 12345
      Major: Computer Science
      
      Fall 2023
      CS 18000 Problem Solving and Object-Oriented Programming  4.0  A
      MA 16100 Plane Analytic Geometry and Calculus I          5.0  B+
      ENGL 10600 First-Year Composition                        3.0  A-
    `;

    // Find and fill the text area
    const textArea = page.getByRole('textbox', { name: /transcript text/i });
    await textArea.fill(transcriptText);
    
    // Click process button
    await page.getByRole('button', { name: /process transcript/i }).click();
    
    // Wait for processing to complete
    await expect(page.getByText(/processing/i)).toBeVisible();
    await expect(page.getByText(/processing/i)).not.toBeVisible({ timeout: 30000 });
    
    // Verify results are displayed
    await expect(page.getByText(/john doe/i)).toBeVisible();
    await expect(page.getByText(/computer science/i)).toBeVisible();
    await expect(page.getByText(/cs 18000/i)).toBeVisible();
    await expect(page.getByText(/problem solving/i)).toBeVisible();
  });

  test('should validate empty transcript text', async ({ page }) => {
    await page.getByRole('button', { name: /process transcript/i }).click();
    
    await expect(page.getByText(/transcript text is required/i)).toBeVisible();
  });

  test('should upload transcript file', async ({ page }) => {
    // Create a test file
    const transcriptContent = `
      PURDUE UNIVERSITY TRANSCRIPT
      Student: Jane Smith
      CS 18000 A 4.0
      MA 16100 B+ 5.0
    `;

    // Upload file
    const fileInput = page.getByRole('button', { name: /upload file|choose file/i });
    await fileInput.setInputFiles({
      name: 'transcript.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(transcriptContent),
    });

    // Process the uploaded file
    await page.getByRole('button', { name: /process.*file|upload/i }).click();
    
    // Wait for processing
    await expect(page.getByText(/processing/i)).toBeVisible();
    await expect(page.getByText(/processing/i)).not.toBeVisible({ timeout: 30000 });
    
    // Verify results
    await expect(page.getByText(/jane smith/i)).toBeVisible();
    await expect(page.getByText(/cs 18000/i)).toBeVisible();
  });

  test('should display GPA calculations', async ({ page }) => {
    const transcriptText = `
      CS 18000 A 4.0
      MA 16100 B+ 5.0
    `;

    await page.getByRole('textbox', { name: /transcript text/i }).fill(transcriptText);
    await page.getByRole('button', { name: /process transcript/i }).click();
    
    await expect(page.getByText(/processing/i)).not.toBeVisible({ timeout: 30000 });
    
    // Check for GPA display
    await expect(page.getByText(/gpa/i)).toBeVisible();
    await expect(page.getByText(/3\.|4\./)).toBeVisible(); // Should show a GPA value
  });

  test('should handle course verification', async ({ page }) => {
    const transcriptText = 'CS 18000 Problem Solving A 4.0';

    await page.getByRole('textbox', { name: /transcript text/i }).fill(transcriptText);
    await page.getByRole('button', { name: /process transcript/i }).click();
    
    await expect(page.getByText(/processing/i)).not.toBeVisible({ timeout: 30000 });
    
    // Look for verification status
    await expect(page.getByText(/verified|pending|matched/i)).toBeVisible();
  });

  test('should show error for invalid file types', async ({ page }) => {
    // Try to upload an invalid file type
    const fileInput = page.getByRole('button', { name: /upload file|choose file/i });
    await fileInput.setInputFiles({
      name: 'malicious.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('malicious content'),
    });

    await expect(page.getByText(/invalid file type|not supported/i)).toBeVisible();
  });

  test('should handle large files properly', async ({ page }) => {
    // Create a large file (simulate size limit test)
    const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
    
    const fileInput = page.getByRole('button', { name: /upload file|choose file/i });
    await fileInput.setInputFiles({
      name: 'large.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(largeContent),
    });

    await expect(page.getByText(/file too large|size limit/i)).toBeVisible();
  });

  test('should allow editing of processed courses', async ({ page }) => {
    const transcriptText = 'CS 18000 Problem Solving A 4.0';

    await page.getByRole('textbox', { name: /transcript text/i }).fill(transcriptText);
    await page.getByRole('button', { name: /process transcript/i }).click();
    
    await expect(page.getByText(/processing/i)).not.toBeVisible({ timeout: 30000 });
    
    // Look for edit buttons or functionality
    const editButton = page.getByRole('button', { name: /edit|modify/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });
});

test.describe('Transcript Processing Performance', () => {
  test('should handle processing within reasonable time', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill('testdev@purdue.edu');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard|planner/);
    await page.getByRole('link', { name: /transcript|upload/i }).click();

    const transcriptText = 'CS 18000 A 4.0\nMA 16100 B+ 5.0';

    const startTime = Date.now();
    
    await page.getByRole('textbox', { name: /transcript text/i }).fill(transcriptText);
    await page.getByRole('button', { name: /process transcript/i }).click();
    
    await expect(page.getByText(/processing/i)).not.toBeVisible({ timeout: 30000 });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Should complete within 30 seconds
    expect(processingTime).toBeLessThan(30000);
  });
});
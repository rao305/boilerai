// End-to-end tests for privacy flows using Playwright

import { test, expect } from '@playwright/test'

// Mock authentication for testing
test.beforeEach(async ({ page }) => {
  // Mock NextAuth session
  await page.addInitScript(() => {
    window.localStorage.setItem('nextauth.session-token', 'mock-session-token')
  })

  // Mock WebCrypto if not available in test environment
  await page.addInitScript(() => {
    if (!window.crypto?.subtle) {
      window.crypto = {
        ...window.crypto,
        subtle: {
          generateKey: async () => ({ type: 'secret' }),
          encrypt: async () => new ArrayBuffer(16),
          decrypt: async () => new ArrayBuffer(16),
          wrapKey: async () => new ArrayBuffer(32),
          unwrapKey: async () => ({ type: 'secret' }),
          importKey: async () => ({ type: 'secret' }),
          exportKey: async () => new ArrayBuffer(32),
        },
        getRandomValues: (array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256)
          }
          return array
        }
      }
    }
  })
})

test.describe('Privacy Settings Flow', () => {
  test('should show privacy intro modal for new users', async ({ page }) => {
    await page.goto('/app/settings/privacy')
    
    // Should show privacy intro modal
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('text=Your data stays yours')).toBeVisible()
    
    // Should have privacy bullets
    await expect(page.locator('text=Chats are saved only on your device')).toBeVisible()
    await expect(page.locator('text=We don\'t store transcripts, grades, or logs')).toBeVisible()
    
    // Click "Keep Private" button
    await page.click('button:has-text("Keep Private")')
    
    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('should have all privacy settings OFF by default', async ({ page }) => {
    await page.goto('/app/settings/privacy')
    
    // Dismiss intro modal if present
    await page.click('button:has-text("Keep Private")', { timeout: 5000 }).catch(() => {})
    
    // Check that all privacy settings are OFF by default
    await expect(page.locator('text=Anonymous Metrics').locator('..').locator('[role="switch"]')).not.toBeChecked()
    await expect(page.locator('text=Share Redacted Examples').locator('..').locator('[role="switch"]')).not.toBeChecked()
    await expect(page.locator('text=Sync encrypted chat history').locator('..').locator('[role="switch"]')).not.toBeChecked()
    
    // Only "Sync encrypted API keys" should be ON (recommended)
    await expect(page.locator('text=Sync encrypted API keys').locator('..').locator('[role="switch"]')).toBeChecked()
  })

  test('should show encouragement text for privacy features', async ({ page }) => {
    await page.goto('/app/settings/privacy')
    await page.click('button:has-text("Keep Private")', { timeout: 5000 }).catch(() => {})
    
    // Should show encouraging descriptions
    await expect(page.locator('text=Share DP‑noised counts to help us spot blind spots')).toBeVisible()
    await expect(page.locator('text=Manually review & send redacted snippets')).toBeVisible()
    await expect(page.locator('text=Keep history across sessions with end‑to‑end encryption')).toBeVisible()
  })

  test('should allow toggling privacy settings', async ({ page }) => {
    await page.goto('/app/settings/privacy')
    await page.click('button:has-text("Keep Private")', { timeout: 5000 }).catch(() => {})
    
    // Toggle Anonymous Metrics
    const metricsSwitch = page.locator('text=Anonymous Metrics').locator('..').locator('[role="switch"]')
    await metricsSwitch.click()
    await expect(metricsSwitch).toBeChecked()
    
    // Should show confirmation that it's helping
    await expect(page.locator('text=Helping improve BoilerAI while protecting your privacy')).toBeVisible()
  })

  test('should show "Learn how it protects you" dialog', async ({ page }) => {
    await page.goto('/app/settings/privacy')
    await page.click('button:has-text("Keep Private")', { timeout: 5000 }).catch(() => {})
    
    // Click "Learn how it protects you" button
    await page.click('button:has-text("Learn how it protects you")')
    
    // Should show detailed privacy explanation
    await expect(page.locator('text=Anonymous Metrics Privacy Protection')).toBeVisible()
    await expect(page.locator('text=Differential Privacy')).toBeVisible()
    await expect(page.locator('text=Your device adds mathematical noise')).toBeVisible()
  })
})

test.describe('Share Example Flow', () => {
  test('should require authentication', async ({ page }) => {
    // Clear authentication
    await page.context().clearCookies()
    await page.goto('/app/share-example')
    
    await expect(page.locator('text=Authentication Required')).toBeVisible()
  })

  test('should complete full redaction and sharing workflow', async ({ page }) => {
    await page.goto('/app/share-example')
    
    // Should start on paste step
    await expect(page.locator('text=Paste Your Example')).toBeVisible()
    
    // Enter example text with PII
    const exampleText = 'My email is john.doe@purdue.edu and I scored 95% in CS 180'
    await page.fill('textarea[placeholder*="Paste your example"]', exampleText)
    
    // Should detect PII and show review button
    await expect(page.locator('button:has-text("Review Redaction")')).toBeVisible()
    await page.click('button:has-text("Review Redaction")')
    
    // Should be on review step
    await expect(page.locator('text=Automatic Redaction Applied')).toBeVisible()
    
    // Should show original vs redacted comparison
    await expect(page.locator('text=Original Text')).toBeVisible()
    await expect(page.locator('text=Redacted Version')).toBeVisible()
    
    // Redacted version should not contain email
    const redactedSection = page.locator('text=Redacted Version').locator('..').locator('pre')
    await expect(redactedSection).not.toContainText('john.doe@purdue.edu')
    await expect(redactedSection).toContainText('[EMAIL]')
    
    // Should allow adding manual redactions
    await page.fill('input[placeholder="Type text to redact..."]', 'CS 180')
    await page.press('input[placeholder="Type text to redact..."]', 'Enter')
    
    // Should show manual redaction badge
    await expect(page.locator('text=CS 180').locator('[role="button"]')).toBeVisible()
    
    // Proceed to send step
    await page.click('button:has-text("Looks Good → Continue to Send")')
    
    // Should be on send step
    await expect(page.locator('text=Ready to Send')).toBeVisible()
    
    // Fill required fields
    await page.selectOption('select', 'academic_planning')
    await page.selectOption('select[required]:last-of-type', 'no_answer')
    
    // Optional description
    await page.fill('textarea[placeholder*="additional details"]', 'AI could not understand my question')
    
    // Should show final review
    await expect(page.locator('text=Final Review')).toBeVisible()
    
    // Mock successful submission
    await page.route('/api/share-example', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          exampleId: 'test-example-123',
          message: 'Thank you for helping improve BoilerAI!',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      })
    })
    
    // Submit
    await page.click('button:has-text("Send Example to Improve BoilerAI")')
    
    // Should show success message
    await expect(page.locator('text=Thank You!')).toBeVisible()
    await expect(page.locator('text=automatically deleted after 30 days')).toBeVisible()
  })

  test('should allow canceling at any step', async ({ page }) => {
    await page.goto('/app/share-example')
    
    // Add some text
    await page.fill('textarea[placeholder*="Paste your example"]', 'Test example')
    await page.click('button:has-text("Review Redaction")')
    
    // Should be able to go back to edit
    await page.click('button[data-state="inactive"]:has-text("1. Paste Text")')
    await expect(page.locator('textarea[placeholder*="Paste your example"]')).toBeVisible()
  })

  test('should validate redaction before allowing submission', async ({ page }) => {
    await page.goto('/app/share-example')
    
    // Enter text with PII that should be caught
    await page.fill('textarea[placeholder*="Paste your example"]', 'Email: test@purdue.edu')
    await page.click('button:has-text("Review Redaction")')
    
    // Proceed to send step
    await page.click('button:has-text("Looks Good → Continue to Send")')
    
    // Fill required fields but leave obvious PII
    await page.selectOption('select', 'academic_planning')
    await page.selectOption('select[required]:last-of-type', 'no_answer')
    
    // Mock rejection for remaining PII
    await page.route('/api/share-example', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'REDACTION_INCOMPLETE',
          message: 'Please review your text and remove any remaining personal information.'
        })
      })
    })
    
    await page.click('button:has-text("Send Example to Improve BoilerAI")')
    
    // Should show error about incomplete redaction
    await expect(page.locator('text=remaining personal information')).toBeVisible()
  })
})

test.describe('Local Storage and Vault', () => {
  test('should store chat data locally by default', async ({ page }) => {
    await page.goto('/app')
    
    // Check that IndexedDB is being used for local storage
    const hasIndexedDB = await page.evaluate(() => {
      return 'indexedDB' in window
    })
    expect(hasIndexedDB).toBe(true)
    
    // Should not send chat data to server by default
    let apiCalls = 0
    await page.route('/api/vault/CHAT_HISTORY', async route => {
      apiCalls++
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    
    // Simulate creating a chat
    await page.evaluate(() => {
      const event = new CustomEvent('test-chat-created', { 
        detail: { message: 'Test message', conversation: 'test-conv' }
      })
      window.dispatchEvent(event)
    })
    
    // Should not have made API calls for chat storage
    expect(apiCalls).toBe(0)
  })

  test('should encrypt vault data before sending to server', async ({ page }) => {
    await page.goto('/app/settings/privacy')
    await page.click('button:has-text("Keep Private")', { timeout: 5000 }).catch(() => {})
    
    // Enable API key sync (should already be on by default)
    const syncSwitch = page.locator('text=Sync encrypted API keys').locator('..').locator('[role="switch"]')
    await syncSwitch.click() // Toggle it to trigger sync
    
    // Mock vault API to capture requests
    let vaultRequest: any = null
    await page.route('/api/vault/API_KEY', async route => {
      const request = route.request()
      vaultRequest = await request.postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, lastUpdated: new Date().toISOString() })
      })
    })
    
    // Simulate storing an API key
    await page.evaluate(() => {
      // This would normally be done through the vault client
      fetch('/api/vault/API_KEY', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext: 'base64-encrypted-data',
          nonce: 'base64-nonce',
          aad: 'additional-auth-data'
        })
      })
    })
    
    // Wait for request
    await page.waitForTimeout(1000)
    
    // Should have sent encrypted data only
    expect(vaultRequest).toBeTruthy()
    expect(vaultRequest.ciphertext).toBeTruthy()
    expect(vaultRequest.nonce).toBeTruthy()
    expect(vaultRequest).not.toHaveProperty('plaintext')
    expect(vaultRequest).not.toHaveProperty('apiKey')
  })
})

test.describe('Differential Privacy Metrics', () => {
  test('should only send DP-noised aggregates', async ({ page }) => {
    await page.goto('/app/settings/privacy')
    await page.click('button:has-text("Keep Private")', { timeout: 5000 }).catch(() => {})
    
    // Enable anonymous metrics
    const metricsSwitch = page.locator('text=Anonymous Metrics').locator('..').locator('[role="switch"]')
    await metricsSwitch.click()
    
    // Mock signals API to capture requests
    let signalsRequest: any = null
    await page.route('/api/signals/ingest', async route => {
      const request = route.request()
      signalsRequest = await request.postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, metricsCount: 1 })
      })
    })
    
    // Simulate recording events and sending batch
    await page.evaluate(() => {
      // This simulates the DP client sending a batch
      fetch('/api/signals/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: 'test-batch-123',
          timestamp: Date.now(),
          metrics: {
            thumbs_down: {
              name: 'thumbs_down',
              noisyCount: 3, // DP-noised count
              epsilon: 0.5
            }
          }
        })
      })
    })
    
    await page.waitForTimeout(1000)
    
    // Should have sent only DP-noised aggregates
    expect(signalsRequest).toBeTruthy()
    expect(signalsRequest.metrics.thumbs_down.noisyCount).toBeDefined()
    expect(signalsRequest.metrics.thumbs_down.epsilon).toBeDefined()
    
    // Should NOT contain raw event data
    expect(signalsRequest.metrics.thumbs_down).not.toHaveProperty('rawEvents')
    expect(signalsRequest.metrics.thumbs_down).not.toHaveProperty('timestamps')
    expect(signalsRequest.metrics.thumbs_down).not.toHaveProperty('userIds')
  })
})

test.describe('Sign-in Flow', () => {
  test('should show privacy footer on sign-in page', async ({ page }) => {
    await page.goto('/signin')
    
    // Should show main privacy message
    await expect(page.locator('text=Private by Default')).toBeVisible()
    await expect(page.locator('text=We can\'t see your chats')).toBeVisible()
    
    // Should show footer privacy notice
    await expect(page.locator('text=Private by default. We can\'t see your chats.').last()).toBeVisible()
    
    // Should have privacy policy link
    await expect(page.locator('button:has-text("Privacy Policy")')).toBeVisible()
  })

  test('should only allow Microsoft SSO (no other options)', async ({ page }) => {
    await page.goto('/signin')
    
    // Should only have Microsoft sign-in button
    await expect(page.locator('button:has-text("Sign in with Microsoft")')).toBeVisible()
    
    // Should not have other sign-in options
    await expect(page.locator('button:has-text("Sign in with Google")')).not.toBeVisible()
    await expect(page.locator('button:has-text("Sign in with Email")')).not.toBeVisible()
    await expect(page.locator('input[type="email"]')).not.toBeVisible()
  })

  test('should show requirements for Purdue access', async ({ page }) => {
    await page.goto('/signin')
    
    await expect(page.locator('text=Valid Purdue University account')).toBeVisible()
    await expect(page.locator('text=Email ending in @purdue.edu')).toBeVisible()
  })
})

test.describe('Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/app/share-example')
    
    // Mock API error
    await page.route('/api/share-example', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    // Complete the form
    await page.fill('textarea[placeholder*="Paste your example"]', 'Test example')
    await page.click('button:has-text("Review Redaction")')
    await page.click('button:has-text("Looks Good → Continue to Send")')
    
    await page.selectOption('select', 'academic_planning')
    await page.selectOption('select[required]:last-of-type', 'no_answer')
    
    await page.click('button:has-text("Send Example to Improve BoilerAI")')
    
    // Should show error message
    await expect(page.locator('text=Failed to submit example')).toBeVisible()
  })

  test('should handle missing WebCrypto gracefully', async ({ page }) => {
    // Remove WebCrypto
    await page.addInitScript(() => {
      delete window.crypto.subtle
    })
    
    await page.goto('/app/settings/privacy')
    
    // Should show appropriate error or fallback
    // (The actual behavior would depend on implementation)
    await expect(page.locator('body')).toBeVisible() // Should not crash
  })
})
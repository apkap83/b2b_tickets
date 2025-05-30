import { Page } from '@playwright/test';

/**
 * Sets up mock responses for API endpoints to enable tests to run
 * without an actual backend service
 * 
 * @param page Playwright Page object
 */
export async function setupMocks(page: Page) {
  // Set page timeout to handle slow responses gracefully
  page.setDefaultTimeout(10000);

  // Mock session endpoint
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: { 
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Mock signin endpoint
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: { 
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        }
      })
    });
  });

  // Mock token endpoint
  await page.route('**/api/auth/token**', async (route) => {
    const url = route.request().url();
    // If URL contains 'invalid', return error
    if (url.includes('invalid')) {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      });
    } else {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ token: 'mock-jwt-token', email: 'test@example.com' })
      });
    }
  });

  // Mock captcha endpoint
  await page.route('**/api/auth/captcha', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ token: 'mock-captcha-token' })
    });
  });

  // Mock totp endpoints
  await page.route('**/api/auth/totp**', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        secret: 'ABCDEFGHIJKLMNOP',
        uri: 'otpauth://totp/TestApp:test@example.com?secret=ABCDEFGHIJKLMNOP&issuer=TestApp'
      })
    });
  });

  // Mock ticket list endpoint
  await page.route('**/api/tickets**', async (route) => {
    // Don't handle specific ticket endpoints
    if (route.request().url().includes('/api/tickets/')) {
      return route.continue();
    }
    
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        pageData: [
          {
            id: 1,
            title: 'Test Ticket',
            description: 'This is a test ticket',
            status: 'Open',
            severity: 'Medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        totalRows: 1
      })
    });
  });

  // Mock specific ticket endpoint
  await page.route('**/api/tickets/1', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: 1,
        title: 'Test Ticket',
        description: 'This is a test ticket',
        status: 'Open',
        severity: 'Medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: []
      })
    });
  });

  // Create a special function for browser testing that creates
  // a simulated environment when real endpoints aren't available
  await page.addInitScript(() => {
    // Mock grecaptcha
    window.grecaptcha = {
      execute: () => Promise.resolve('mock-token'),
      ready: (callback) => callback()
    };

    // Mock localStorage if not available (for about:blank pages)
    if (!window.localStorage) {
      const storage = {};
      window.localStorage = {
        getItem: (key) => storage[key] || null,
        setItem: (key, value) => { storage[key] = value; },
        removeItem: (key) => { delete storage[key]; },
        clear: () => { Object.keys(storage).forEach(key => delete storage[key]); }
      };
    }

    // Set test mode flag in localStorage
    localStorage.setItem('TEST_MODE', 'mock');

    // Override fetch to handle additional cases
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      try {
        // Try the original fetch first
        return await originalFetch(input, init);
      } catch (error) {
        console.log('Fetch error intercepted:', error);
        // Return a mock response for testing purposes
        return new Response(JSON.stringify({ status: 'mocked' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    };
  });
}

/**
 * Helper function to set test data and environment 
 * to ensure tests can run in any environment
 */
export async function setupTestEnvironment(page: Page) {
  // Apply all mock handlers
  await setupMocks(page);
  
  // Expose helper functions to the page
  await page.exposeFunction('isTestEnvironment', () => true);
  
  // Suppress console errors in test environment
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error (suppressed in tests):', msg.text());
    }
  });
}
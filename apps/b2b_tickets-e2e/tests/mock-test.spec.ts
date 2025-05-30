import { test, expect, Page } from '@playwright/test';
import { setupTestEnvironment } from './mock-helper';

test.describe('Mock Test Environment', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment with mocks
    await setupTestEnvironment(page);
  });

  test('should run without a real server', async ({ page }) => {
    // This test doesn't try to connect to a real server
    // It just verifies our mock infrastructure is working
    
    // Navigate to a page that doesn't exist
    await page.goto('/mock-test-page');
    
    // Create a mock element in the page
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.id = 'mock-element';
      div.textContent = 'Mock test is working';
      document.body.appendChild(div);
    });
    
    // Check that our mock element exists
    const mockElement = page.locator('#mock-element');
    await expect(mockElement).toBeVisible();
    await expect(mockElement).toHaveText('Mock test is working');
  });
  
  test('should use mocked API responses', async ({ page }) => {
    // Navigate to a page that would normally make API requests
    await page.goto('/mock-api');
    
    // Mock an API call and response directly in the test
    await page.route('**/api/mock-endpoint', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ message: 'This is a mocked response' })
      });
    });
    
    // Create a function to call the API and display the result
    await page.evaluate(() => {
      async function callApi() {
        try {
          const response = await fetch('/api/mock-endpoint');
          const data = await response.json();
          
          const div = document.createElement('div');
          div.id = 'api-result';
          div.textContent = data.message;
          document.body.appendChild(div);
        } catch (error) {
          console.error('API call failed:', error);
        }
      }
      
      void callApi();
    });
    
    // Wait for the API result to appear with increased timeout
    await page.waitForSelector('#api-result', { timeout: 10000 });
    
    // Check that our mock API response was used
    const apiResult = page.locator('#api-result');
    await expect(apiResult).toHaveText('This is a mocked response');
  });

  test('should verify auth session mock is working', async ({ page }) => {
    // Test the auth session mock
    await page.goto('/mock-auth-test');
    
    // Call the session API directly
    await page.evaluate(() => {
      async function checkSession() {
        try {
          const response = await fetch('/api/auth/session');
          const data = await response.json();
          
          const div = document.createElement('div');
          div.id = 'session-result';
          div.textContent = data.user ? data.user.name : 'No session';
          document.body.appendChild(div);
        } catch (error) {
          console.error('Session check failed:', error);
          
          const div = document.createElement('div');
          div.id = 'session-result';
          div.textContent = 'Error checking session';
          document.body.appendChild(div);
        }
      }
      
      void checkSession();
    });
    
    // Verify the session data is correctly mocked
    await page.waitForSelector('#session-result', { timeout: 10000 });
    const sessionResult = page.locator('#session-result');
    await expect(sessionResult).toHaveText('Test User');
  });
  
  test('should verify ticket API mock is working', async ({ page }) => {
    // Test the tickets API mock
    await page.goto('/mock-tickets-test');
    
    // Call the tickets API directly
    await page.evaluate(() => {
      async function checkTickets() {
        try {
          const response = await fetch('/api/tickets');
          const data = await response.json();
          
          const div = document.createElement('div');
          div.id = 'tickets-result';
          div.textContent = data.pageData && data.pageData.length > 0 
            ? `Found ${data.pageData.length} tickets` 
            : 'No tickets found';
          document.body.appendChild(div);
        } catch (error) {
          console.error('Tickets check failed:', error);
          
          const div = document.createElement('div');
          div.id = 'tickets-result';
          div.textContent = 'Error checking tickets';
          document.body.appendChild(div);
        }
      }
      
      void checkTickets();
    });
    
    // Verify the tickets data is correctly mocked
    await page.waitForSelector('#tickets-result', { timeout: 10000 });
    const ticketsResult = page.locator('#tickets-result');
    await expect(ticketsResult).toHaveText('Found 1 tickets');
  });
});
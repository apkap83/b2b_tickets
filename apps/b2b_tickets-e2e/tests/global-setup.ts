/**
 * This file is used to set up the test environment before tests start running.
 * It's used when the USE_MOCK_DATA environment variable is set.
 */
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Setting up mock data environment');
  
  // Set up mock environment variables
  process.env.TEST_ENV = 'mock';
  
  // Ensure all tests know they're running in mock mode
  process.env.USE_MOCK_DATA = '1';
  
  // Launch a browser to set up any global state if needed
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to a real page instead of about:blank to avoid localStorage security issues
    await page.goto('https://example.com');
    
    // Try to set up test flags (may not be necessary, but good to verify browser works)
    await page.evaluate(() => {
      try {
        localStorage.setItem('TEST_MODE', 'mock');
        console.log('Storage accessible');
      } catch (e) {
        console.log('Storage not accessible in global setup (this is okay)');
      }
    });
    
    console.log('Browser environment tested and ready');
  } catch (error) {
    console.log('Browser setup completed with warnings (this is okay)');
  } finally {
    await browser.close();
  }
  
  console.log('Mock data environment is ready');
}

export default globalSetup;
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

  // In Docker/CI environments, skip browser setup
  if (process.env.CI || process.env.SKIP_BROWSER_TESTS) {
    console.log('CI/Docker environment detected, skipping browser setup');
    return;
  }
  
  try {
    // Try to launch browser - if it fails, log but continue
    console.log('Attempting to launch browser for global setup...');
    
    // Launch with reduced timeouts to fail faster if browsers aren't installed
    const browser = await chromium.launch({ timeout: 10000 }).catch(error => {
      console.log('Browser launch failed (this is okay in CI/Docker):', error.message);
      return null;
    });
    
    // If browser failed to launch, skip the rest
    if (!browser) {
      console.log('Skipping browser-based setup');
      return;
    }
    
    const page = await browser.newPage();
    
    try {
      // Instead of navigating to a real page which could fail, just set content
      await page.setContent('<html><body><div>Test Setup</div></body></html>');
      
      // Try to set up test flags
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
      console.log('Browser setup completed with warnings (this is okay):', error.message);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.log('Global setup completed with errors (continuing anyway):', error.message);
  }
  
  console.log('Mock data environment is ready');
}

export default globalSetup;
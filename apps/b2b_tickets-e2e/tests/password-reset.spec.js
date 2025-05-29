import { test, expect } from '@playwright/test';

test.describe('Password Reset E2E Tests', () => {
  const validEmail = 'test@example.com';
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/signin');
  });
  
  test('should navigate to forgot password page', async ({ page }) => {
    // Click the "Forgot Password" link
    await page.getByText('Forgot Password?').click();
    
    // Verify we're on the forgot password page
    await expect(page).toHaveURL(/.*\/forgotCred/);
    await expect(page.getByText('Reset your password')).toBeVisible();
  });
  
  test('should show validation errors for invalid email', async ({ page }) => {
    // Go to forgot password page
    await page.getByText('Forgot Password?').click();
    
    // Enter invalid email
    await page.getByLabel('Email').fill('invalid-email');
    
    // Submit the form
    await page.getByRole('button', { name: 'Reset Password' }).click();
    
    // Verify validation error appears
    await expect(page.getByText('Please enter a valid email')).toBeVisible();
  });
  
  test('should show success message for valid email submission', async ({ page }) => {
    // Mock the API response for reCAPTCHA
    await page.route('**/api/auth/captcha', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ token: 'mock-captcha-jwt-token' }),
      });
    });
    
    // Mock the API response for reset password
    await page.route('**/api/user/resetPassToken', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          message: 'An email has been sent with instructions to reset your password.' 
        }),
      });
    });
    
    // Go to forgot password page
    await page.getByText('Forgot Password?').click();
    
    // Enter valid email
    await page.getByLabel('Email').fill(validEmail);
    
    // Mock reCAPTCHA completion
    // Note: In a real test, you'd need to handle reCAPTCHA differently
    // This is a simplified approach for demonstration purposes
    await page.evaluate(() => {
      window.grecaptcha = {
        execute: () => Promise.resolve('mock-token'),
        ready: (cb) => cb(),
      };
    });
    
    // Submit the form
    await page.getByRole('button', { name: 'Reset Password' }).click();
    
    // Verify success message appears
    await expect(page.getByText(/email has been sent/i)).toBeVisible();
  });
  
  test('should be able to complete the password reset process with valid token', async ({ page }) => {
    // Mock the API response for validating the reset token
    await page.route('**/api/auth/token**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ token: 'mock-jwt-token', email: validEmail }),
      });
    });
    
    // Mock the API response for setting the new password
    await page.route('**/api/auth/signin**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ ok: true }),
      });
    });
    
    // Navigate directly to the reset password page with a token
    await page.goto('/reset-pass/mock-reset-token');
    
    // Verify we're on the reset password page
    await expect(page.getByText('Reset your password')).toBeVisible();
    
    // Enter new password
    await page.getByLabel('New Password').fill('StrongPassword123!');
    await page.getByLabel('Confirm Password').fill('StrongPassword123!');
    
    // Mock reCAPTCHA completion
    await page.evaluate(() => {
      window.grecaptcha = {
        execute: () => Promise.resolve('mock-token'),
        ready: (cb) => cb(),
      };
    });
    
    // Submit the form
    await page.getByRole('button', { name: 'Reset Password' }).click();
    
    // Verify redirected to signin page
    await expect(page).toHaveURL(/.*\/signin/);
    
    // Verify success notification appears
    await expect(page.getByText('Password has been reset successfully')).toBeVisible();
  });
  
  test('should show error for password mismatch', async ({ page }) => {
    // Navigate directly to the reset password page with a token
    await page.goto('/reset-pass/mock-reset-token');
    
    // Enter mismatched passwords
    await page.getByLabel('New Password').fill('StrongPassword123!');
    await page.getByLabel('Confirm Password').fill('DifferentPassword123!');
    
    // Submit the form
    await page.getByRole('button', { name: 'Reset Password' }).click();
    
    // Verify error message
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });
  
  test('should show error for invalid token', async ({ page }) => {
    // Mock the API response for an invalid token
    await page.route('**/api/auth/token**', async (route) => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      });
    });
    
    // Navigate directly to the reset password page with an invalid token
    await page.goto('/reset-pass/invalid-token');
    
    // Verify error message
    await expect(page.getByText('Invalid or expired token')).toBeVisible();
  });
});
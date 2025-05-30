import { test, expect, Page } from '@playwright/test';
import { setupTestEnvironment } from './mock-helper';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';

// Mock user data for LDAP user
const mockLdapUser = {
  id: 1,
  name: 'LDAP User',
  email: 'ldap@example.com',
  userName: 'ldapuser',
  firstName: 'LDAP',
  lastName: 'User',
  authenticationType: AuthenticationTypes.LDAP,
  roles: ['B2B Ticket Creator']
};

// Mock user data for local user
const mockLocalUser = {
  id: 2,
  name: 'Local User',
  email: 'local@example.com',
  userName: 'localuser',
  firstName: 'Local',
  lastName: 'User',
  authenticationType: AuthenticationTypes.LOCAL,
  roles: ['B2B Ticket Creator']
};

/**
 * Helper function to set up auth with a specific user type
 */
async function setupUserAuth(page: Page, userType: 'ldap' | 'local') {
  const user = userType === 'ldap' ? mockLdapUser : mockLocalUser;
  
  // Mock the authentication API
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ user })
    });
  });

  // Mock the session API
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Mock password reset API if needed
  await page.route('**/api/admin/users/reset-password', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ success: true })
    });
  });

  // Go to sign in page
  await page.goto('/signin');
  
  // Fill in the login form
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill('password123');
  
  // Submit the form
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // Wait for navigation to complete
  await page.waitForURL('/**/');
}

test.describe('Profile Page', () => {
  // For tests that can use mocks
  test.describe('Mock Tests', () => {
    test.beforeEach(async ({ page }) => {
      await setupTestEnvironment(page);
    });

    test('should navigate to profile page', async ({ page }) => {
      // Setup local user session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockLocalUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Verify profile page title is visible
      await expect(page.getByRole('heading', { name: 'User Profile Details' })).toBeVisible();
    });

    test('should display user details correctly for LOCAL user', async ({ page }) => {
      // Setup local user session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockLocalUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Verify user details are correct
      await expect(page.getByText(`First Name: ${mockLocalUser.firstName}`)).toBeVisible();
      await expect(page.getByText(`Last Name: ${mockLocalUser.lastName}`)).toBeVisible();
      await expect(page.getByText(`User Name: ${mockLocalUser.userName}`)).toBeVisible();
      await expect(page.getByText(`Account Type: ${mockLocalUser.authenticationType}`)).toBeVisible();
      
      // Verify "Reset Password" button is visible for LOCAL users
      await expect(page.getByRole('button', { name: 'Reset Password' })).toBeVisible();
    });

    test('should display user details correctly for LDAP user', async ({ page }) => {
      // Setup LDAP user session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockLdapUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Verify user details are correct
      await expect(page.getByText(`First Name: ${mockLdapUser.firstName}`)).toBeVisible();
      await expect(page.getByText(`Last Name: ${mockLdapUser.lastName}`)).toBeVisible();
      await expect(page.getByText(`User Name: ${mockLdapUser.userName}`)).toBeVisible();
      await expect(page.getByText(`Account Type: ${mockLdapUser.authenticationType}`)).toBeVisible();
      
      // Verify "Reset Password" button is NOT visible for LDAP users
      await expect(page.getByRole('button', { name: 'Reset Password' })).not.toBeVisible();
    });

    test('should navigate back to home on Close button click', async ({ page }) => {
      // Setup local user session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockLocalUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Click Close button
      await page.getByRole('link', { name: 'Close' }).click();
      
      // Verify navigation to home page
      await expect(page).toHaveURL('/');
    });

    test('should open password reset modal for LOCAL users', async ({ page }) => {
      // Setup local user session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockLocalUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Click Reset Password button
      await page.getByRole('button', { name: 'Reset Password' }).click();
      
      // Verify password reset modal appears
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Reset Password')).toBeVisible();
    });

    test('should be able to reset password in modal', async ({ page }) => {
      // Setup local user session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockLocalUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Click Reset Password button
      await page.getByRole('button', { name: 'Reset Password' }).click();
      
      // Fill in new password
      await page.getByLabel(/new password/i).fill('NewPassword123!');
      await page.getByLabel(/confirm password/i).fill('NewPassword123!');
      
      // Submit the form
      await page.getByRole('button', { name: /reset/i }).click();
      
      // Verify success message
      await expect(page.getByText(/password reset successfully/i)).toBeVisible();
    });

    test('should show error for password mismatch', async ({ page }) => {
      // Setup local user session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockLocalUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Click Reset Password button
      await page.getByRole('button', { name: 'Reset Password' }).click();
      
      // Fill in mismatched passwords
      await page.getByLabel(/new password/i).fill('NewPassword123!');
      await page.getByLabel(/confirm password/i).fill('DifferentPassword123!');
      
      // Submit the form
      await page.getByRole('button', { name: /reset/i }).click();
      
      // Verify error message
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should handle unauthenticated access correctly', async ({ page }) => {
      // Mock unauthenticated session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: null
          })
        });
      });
      
      // Attempt to navigate to profile page
      await page.goto('/profile');
      
      // Verify redirect to sign-in page
      await expect(page).toHaveURL(/.*signin.*/);
    });
  });
});
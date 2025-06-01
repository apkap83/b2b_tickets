import { test, expect, Page } from '@playwright/test';
import { setupTestEnvironment } from './mock-helper';

// Define ErrorCode enum locally for testing
enum ErrorCode {
  IncorrectUsernameOrPassword = 'incorrect-username-or-password',
  NoCredentialsProvided = 'no-credentials-provided',
  UserNotFound = 'user-not-found',
  UserIsLocked = 'user-is-locked',
  IncorrectPassword = 'incorrect-password',
  UserMissingPassword = 'missing-password',
  TwoFactorDisabled = 'two-factor-disabled',
  TwoFactorAlreadyEnabled = 'two-factor-already-enabled',
  TwoFactorSetupRequired = 'two-factor-setup-required',
  SecondFactorRequired = 'second-factor-required',
  IncorrectTwoFactorCode = 'incorrect-two-factor-code',
  InternalServerError = 'internal-server-error',
  NewPasswordMatchesOld = 'new-password-matches-old',
  CaptchaJWTTokenRequired = 'captcha-jwt-token-required',
  CaptchaJWTTokenInvalid = 'captcha-jwt-token-invalid',
  EmailIsRequired = 'email-is-required',
  IncorrectEmailProvided = 'incorrect-email-provided',
  IfAccountExistsYouWillReceivePasswordResetLink = 'if-account-exists-you-will-receive-password-reset-link',
  TotpJWTTokenRequired = 'totp-jwt-token-required',
  TotpJWTTokenInvalid = 'totp-jwt-token-invalid',
  TokenForEmailRequired = 'token-for-email-required',
  IncorrectPassResetTokenProvided = 'incorrect-pass-reset-token-provided',
  EmailJWTTokenRequired = 'email-jwt-token-required',
  EmailJWTTokenInvalid = 'email-jwt-token-invalid',
  NewPasswordRequired = 'new-password-required',
  NoRoleAssignedToUser = 'no-role-assigned-to-user',
  DecryptionFailed = 'decryption-failed',
  MaxOtpAttemptsRequested = 'max-otp-attempts-requested'
};

// Mock user data
const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  userName: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  roles: ['B2B Ticket Creator'],
  permissions: ['Tickets_Page', 'Create_New_Ticket']
};

/**
 * Helper function to set up auth
 */
async function setupAuth(page: Page) {
  // Mock the authentication API
  await page.route('**/api/auth/signin', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ user: mockUser })
    });
  });

  // Mock the session API
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ 
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
  });

  // Go to sign in page
  await page.goto('/signin');
  
  // Fill in the login form
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  
  // Submit the form
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // Wait for navigation to complete
  await page.waitForURL('/**/');
}

test.describe('Error Handling', () => {
  // For tests that can use mocks
  test.describe('Mock Tests', () => {
    test.beforeEach(async ({ page }) => {
      await setupTestEnvironment(page);
    });

    test('should handle authentication errors', async ({ page }) => {
      // Navigate to sign-in page
      await page.goto('/signin');
      
      // Mock authentication error
      await page.route('**/api/auth/signin', async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ 
            error: ErrorCode.IncorrectUsernameOrPassword,
            message: 'Incorrect username or password'
          })
        });
      });
      
      // Fill in the login form with incorrect credentials
      await page.getByLabel('Email').fill('wrong@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      
      // Submit the form
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Verify error message is displayed
      await expect(page.getByText(/incorrect username or password/i)).toBeVisible();
    });

    test('should handle locked user account', async ({ page }) => {
      // Navigate to sign-in page
      await page.goto('/signin');
      
      // Mock locked user error
      await page.route('**/api/auth/signin', async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ 
            error: ErrorCode.UserIsLocked,
            message: 'Account is locked. Please contact an administrator.'
          })
        });
      });
      
      // Fill in the login form
      await page.getByLabel('Email').fill('locked@example.com');
      await page.getByLabel('Password').fill('password123');
      
      // Submit the form
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Verify error message about locked account
      await expect(page.getByText(/account is locked/i)).toBeVisible();
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Set up auth first
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Mock server error for tickets API
      await page.route('**/api/tickets**', async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ 
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while processing your request'
          })
        });
      });
      
      // Verify error state or message is displayed
      // This will depend on how your application handles API errors
      await expect(page.getByText(/error|failed to load/i)).toBeVisible();
    });

    test('should handle validation errors in forms', async ({ page }) => {
      // Set up auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to tickets page to create a ticket
      await page.goto('/tickets');
      
      // Mock categories API for the form
      await page.route('**/api/tickets/categories', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            { category_id: '1', Category: 'Network' }
          ])
        });
      });
      
      // Mock validation error response
      await page.route('**/api/tickets/create', async (route) => {
        await route.fulfill({
          status: 400,
          body: JSON.stringify({ 
            status: 'ERROR',
            fieldErrors: {
              title: ['Title is required'],
              contactPerson: ['Contact person is required'],
              contactPhoneNum: ['Contact phone number is required'],
              occurrenceDate: ['Occurrence date is required']
            },
            message: 'Validation failed'
          })
        });
      });
      
      // Click create ticket button
      await page.getByRole('button', { name: /create ticket/i, exact: false }).click();
      
      // Fill the form incompletely
      await page.getByLabel(/title/i).fill(''); // Empty title
      
      // Submit the form
      await page.getByRole('button', { name: /submit/i }).click();
      
      // Verify validation errors are displayed
      await expect(page.getByText('Title is required')).toBeVisible();
      await expect(page.getByText('Contact person is required')).toBeVisible();
      await expect(page.getByText('Contact phone number is required')).toBeVisible();
    });

    test('should handle network connectivity issues', async ({ page }) => {
      // Set up auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Simulate network failure for a specific API
      await page.route('**/api/tickets**', async (route) => {
        await route.abort('failed');
      });
      
      // Check for any error state or network error message
      // This will depend on how your application handles network failures
      await expect(page.getByText(/failed to load|network error|connection/i)).toBeVisible();
    });

    test('should handle not found resources', async ({ page }) => {
      // Set up auth
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to a non-existent ticket
      await page.goto('/ticket/99999');
      
      // Mock 404 response for ticket API
      await page.route('**/api/tickets/99999', async (route) => {
        await route.fulfill({
          status: 404,
          body: JSON.stringify({ 
            error: 'Not Found',
            message: 'Ticket not found'
          })
        });
      });
      
      // Verify 404 page or error message
      await expect(page.getByText(/not found/i)).toBeVisible();
    });

    test('should handle permissions/access denied errors', async ({ page }) => {
      // Set up auth with limited permissions
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: {
              ...mockUser,
              permissions: ['Tickets_Page'] // Limited permissions, no admin access
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Try to access admin page
      await page.goto('/admin');
      
      // Verify access denied page or error
      await expect(page).toHaveURL(/.*\/denied.*/);
      await expect(page.getByText(/access denied|unauthorized/i)).toBeVisible();
    });

    test('should handle session expiration', async ({ page }) => {
      // First set up valid session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      });
      
      // Navigate to tickets page
      await page.goto('/tickets');
      
      // Now simulate session expiration by changing the session response
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ 
            error: 'Unauthorized',
            message: 'Session expired'
          })
        });
      });
      
      // Trigger a new navigation or action that would check the session
      await page.reload();
      
      // Verify redirect to login page or session expired message
      await expect(page).toHaveURL(/.*signin.*/);
    });

    test('should handle password reset token errors', async ({ page }) => {
      // Navigate to reset password page with invalid token
      await page.goto('/reset-pass/invalid-token');
      
      // Mock invalid token API response
      await page.route('**/api/auth/token**', async (route) => {
        await route.fulfill({
          status: 400,
          body: JSON.stringify({ 
            error: ErrorCode.IncorrectPassResetTokenProvided,
            message: 'Invalid or expired token'
          })
        });
      });
      
      // Verify error message about invalid token
      await expect(page.getByText(/invalid or expired token/i)).toBeVisible();
    });
  });
});
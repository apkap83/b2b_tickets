# Testing Password Reset Functionality

This document describes different approaches to testing the password reset functionality in the b2b_tickets application.

## Test Approaches

The password reset flow can be tested at different levels:

1. **Unit Tests**: Testing individual components and API routes
2. **Integration Tests**: Testing interactions between components
3. **End-to-End Tests**: Testing the complete user flow

## Running the Tests

### Unit and Integration Tests

Unit and integration tests use Jest and React Testing Library:

```bash
# Run all password reset related tests
nx test b2b_tickets --testPathPattern=password-reset

# Run individual test files
nx test b2b_tickets --testPathPattern=password-reset-form
nx test b2b_tickets --testPathPattern=forgot-password-flow
```

### End-to-End Tests

E2E tests use Playwright:

```bash
# Run from the project root
nx run b2b_tickets-e2e:e2e --testPathPattern=password-reset

# Or navigate to the e2e directory and run directly
cd apps/b2b_tickets-e2e
npx playwright test --project chromium tests/password-reset.spec.js
```

## Test Files

1. **Unit Tests**:
   - `apps/b2b_tickets/specs/password-reset.spec.tsx`: Tests the password reset API route
   - `apps/b2b_tickets/specs/password-reset-form.spec.tsx`: Tests the password reset form component

2. **Integration Tests**:
   - `apps/b2b_tickets/specs/forgot-password-flow.spec.tsx`: Tests the forgot password flow

3. **End-to-End Tests**:
   - `apps/b2b_tickets-e2e/tests/password-reset.spec.js`: Tests the full password reset flow

## Test Coverage

The tests cover:

1. **Request Password Reset**:
   - Email validation
   - reCAPTCHA validation
   - API request handling
   - Success and error notifications

2. **Reset Password Form**:
   - Password validation (complexity, matching)
   - Token validation
   - Form submission
   - Redirection after success

3. **Edge Cases**:
   - Invalid/expired tokens
   - Rate limiting (max attempts)
   - Non-existent users

## Manual Testing Checklist

For manual testing:

1. **Forgot Password Flow**:
   - [ ] Navigate to sign-in page and click "Forgot Password?"
   - [ ] Enter a valid email and complete reCAPTCHA
   - [ ] Verify a success message appears
   - [ ] Check that an email is received with a reset link
   - [ ] Verify the reset link contains a valid token

2. **Reset Password Flow**:
   - [ ] Click the link in the email
   - [ ] Verify you're redirected to the reset password page
   - [ ] Try entering non-matching passwords and verify validation errors
   - [ ] Try entering a weak password and verify complexity requirements
   - [ ] Enter a valid new password and confirm
   - [ ] Verify you're redirected to the sign-in page
   - [ ] Try signing in with the new password

3. **Security Testing**:
   - [ ] Try using an expired or used token
   - [ ] Try accessing the reset password page directly without a token
   - [ ] Try submitting multiple reset requests for the same email in quick succession

## Testing Environment Configuration

For testing with real emails:

1. Set up a test email account
2. Configure the application to use this account for testing
3. Use environment variables to control the email behavior:

```
# .env.test
EMAIL_SERVICE=test
EMAIL_FROM=test@example.com
EMAIL_TOKEN_EXPIRY=15m  # Short expiry for testing
```

## Mocking Dependencies for Tests

The following dependencies are mocked in tests:

1. **Email Service**: To prevent sending real emails during tests
2. **reCAPTCHA**: To bypass the CAPTCHA verification
3. **Redis**: To simulate OTP storage and verification
4. **Database**: To simulate user lookup and password updates

## Common Issues and Solutions

1. **reCAPTCHA in Tests**:
   - The reCAPTCHA component is mocked to simulate user interaction
   - For E2E tests, we bypass the reCAPTCHA verification by mocking the API responses

2. **Email Verification**:
   - In tests, we don't actually send emails
   - For E2E tests, we can either mock the email service or use test email providers
   
3. **Token Expiration**:
   - To test token expiration, modify the JWT expiration time in the test environment
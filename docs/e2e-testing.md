# End-to-End Testing Guide

This document provides information about running and configuring End-to-End (E2E) tests for the B2B Tickets application.

## Running Tests

The application supports several different E2E testing modes:

### Standard Mode

Runs tests with automatic server detection - will use mock tests if server isn't running:

```bash
npm run test:e2e
```

Or using NX directly:

```bash
nx run b2b_tickets-e2e:e2e
```

### Headless Mode

Runs tests in headless browsers:

```bash
npm run test:e2e:headless
```

Or using NX directly:

```bash
nx run b2b_tickets-e2e:e2e --configuration=headless
```

### Mock Mode

Runs only the tests that work with mock data, without requiring a real server:

```bash
npm run test:e2e:mock
```

Or using NX directly:

```bash
nx run b2b_tickets-e2e:e2e --configuration=mock
```

### Mock-Only Mode

Runs only the most basic mock tests that are guaranteed to pass without a server:

```bash
npm run test:e2e:mock-only
```

Or using NX directly:

```bash
nx run b2b_tickets-e2e:e2e --configuration=mock-only
```

### Skip Mode

Skips all browser tests (useful for CI environments):

```bash
npm run test:e2e:skip
```

Or using NX directly:

```bash
nx run b2b_tickets-e2e:e2e --configuration=skip
```

### Debug Mode

Runs tests with the Playwright UI debugger:

```bash
npm run test:e2e:debug
```

Or using NX directly:

```bash
nx run b2b_tickets-e2e:e2e --configuration=debug
```

## Test Files

The E2E tests are located in the `apps/b2b_tickets-e2e/tests` directory:

### Basic Tests (Always Run)
- `example.spec.ts`: Basic Playwright example tests that should always pass
- `mock-test.spec.ts`: Tests for the mock environment (no server required)

### Feature Tests
- `admin-dashboard.spec.ts`: Tests for the admin dashboard (requires server)
- `CreateUser.spec.js`: Tests for user creation (requires server)
- `error-handling.spec.ts`: Tests for error handling scenarios
- `navigation.spec.ts`: Tests for navigation and routing
- `password-reset.spec.js`: Tests for password reset functionality (requires server)
- `performance.spec.ts`: Tests for performance of ticket lists and forms
- `profile-page.spec.ts`: Tests for the user profile page
- `ticket-creation.spec.ts`: Tests for ticket creation functionality
- `ticket-details.spec.ts`: Tests for ticket details page (requires server)
- `tickets-list.spec.ts`: Tests for tickets list page (requires server)

## Mock Environment

The mock environment allows running tests without a real server by:

1. Intercepting API requests and returning mock responses
2. Using a global setup file (`global-setup.ts`) to set environment variables
3. Providing mock implementation of browser APIs and services

The mocks are configured in the `mock-helper.ts` file and include:

- Authentication session mocks
- API endpoint mocks
- Browser API mocks (localStorage, fetch, etc.)

## Server Detection

The test script automatically checks if the server is running at http://127.0.0.1:3000 before running tests. If the server is not running:

- The standard and headless modes will automatically fall back to mock tests
- The debug mode will run only mock tests
- The mock and mock-only modes will run as normal since they don't require a server

To run tests that require a server, make sure to start the server first:

```bash
# Start the server in a separate terminal
nx dev b2b_tickets
```

## Writing Tests

When writing new E2E tests, consider whether the test needs a real server or can work with mocks.

### Tests That Require a Server

For tests that require a real server:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature requiring server', () => {
  test('should perform server-dependent action', async ({ page }) => {
    // Test implementation using real server
    await page.goto('/some-page');
    // ...
  });
});
```

### Tests That Can Use Mocks

For tests that can work with mocks:

```typescript
import { test, expect } from '@playwright/test';
import { setupTestEnvironment } from './mock-helper';

test.describe('Feature with mocks', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock environment
    await setupTestEnvironment(page);
  });

  test('should perform mocked action', async ({ page }) => {
    // Test implementation using mocks
    await page.goto('/mock-page');
    // ...
  });
});
```

## Test Categories

The test suite covers several categories of tests:

### Functional Tests
- Navigation and routing
- User authentication
- Ticket creation and management
- Admin dashboard functionality
- Profile page functionality

### Error Handling Tests
- Authentication errors
- API errors
- Form validation errors
- Permission errors
- Session expiration

### Performance Tests
- Pagination performance
- Large dataset filtering
- Table rendering
- Form submission

## Adding New Mock Data

To add new mock data:

1. Update the `setupMocks` function in `mock-helper.ts`
2. Add route handlers for new API endpoints
3. Add mock data structures for the responses

Example:

```typescript
// Add a new mock endpoint
await page.route('**/api/new-endpoint', async (route) => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ 
      data: { 
        property: 'value'
      }
    })
  });
});
```

## Debugging Tests

To debug tests:

1. Use the debug mode: `npm run test:e2e:debug`
2. Add `await page.pause()` in your test to pause execution
3. Use `console.log()` statements (these will appear in the terminal)
4. Check the HTML report after test completion: `npx playwright show-report`

## Common Issues

1. **Tests timing out**: Increase the timeout in the test configuration or the specific test
2. **WebSocket connection failures**: These are expected in mock mode and can be ignored
3. **Authentication issues**: Ensure the mock auth handlers are properly configured
4. **Missing API routes**: Add mock handlers for any new API endpoints used in tests
5. **Server not running**: Make sure the server is running when running tests that require it, or use mock modes

## Performance Measurement

Performance tests use the `measureLoadTime` helper function to track the time taken for specific operations:

```typescript
// Helper function to measure load time
async function measureLoadTime(action: () => Promise<void>): Promise<number> {
  const startTime = Date.now();
  await action();
  return Date.now() - startTime;
}

// Usage in a test
const loadTime = await measureLoadTime(async () => {
  await page.goto('/tickets');
  await expect(page.getByText('Tickets')).toBeVisible();
});

// Assert performance expectations
expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds
```

## Test Scripts

The E2E tests are configured using several scripts:

- `run-headless-tests.sh`: Main script that handles different test modes and server detection
- `run-mock-tests.sh`: Script specifically for mock-only mode

These scripts are configured in `project.json` and can be run via npm or nx commands.
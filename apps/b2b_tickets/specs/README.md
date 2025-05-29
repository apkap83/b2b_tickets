# b2b_tickets Tests

This directory contains unit tests for the b2b_tickets application components and pages.

## Test Structure

The tests are organized to match the application structure:

- `index.spec.tsx`: Tests for the home page redirect functionality
- `WebSocketWrapper.spec.tsx`: Tests for the WebSocket wrapper component
- `simple-tests.spec.tsx`: A simple test to verify the test setup is working
- `CookieConsentBanner.spec.tsx`: Tests for the cookie consent banner component (needs fixing)
- `tickets-page.spec.tsx`: Tests for the tickets listing page (needs fixing)

## Running Tests

You can run the tests using the Nx commands defined in the project:

```bash
# Run tests for b2b_tickets application
nx test b2b_tickets

# Run specific tests by pattern
nx test b2b_tickets --testPathPattern=WebSocketWrapper

# Run with coverage
nx test b2b_tickets --coverage --verbose

# Run in watch mode
nx test b2b_tickets --watch
```

## Test Framework

The tests use:
- Jest as the test runner
- React Testing Library for component testing
- Jest mocks for mocking dependencies

## Testing Approach

We have multiple approaches to testing components in this codebase:

1. **Direct Testing**: Testing components directly (e.g., WebSocketWrapper.spec.tsx)
2. **Simplified Mock Testing**: Creating simplified versions of complex components (e.g., mock-banner.spec.tsx)
3. **Basic Unit Tests**: Simple tests for specific functions (e.g., simple-tests.spec.tsx)

## Known Issues and Solutions

1. **Module Mocking Issues**: Properly mock imports with default exports by including both named exports and a default export in the mock.

   ```javascript
   // Example
   jest.mock('@b2b-tickets/config', () => ({
     // Named exports
     ShowCookieConsentBanner: true,
     // Default export
     default: {
       ShowCookieConsentBanner: true
     }
   }));
   ```

2. **Component Mocking**: For components that use Material UI, Next.js, or other external components, create simple mock implementations with `data-testid` attributes.

   ```javascript
   jest.mock('@mui/material/Button', () => {
     return {
       __esModule: true,
       default: ({ children, onClick, variant }) => (
         <button 
           onClick={onClick} 
           data-testid={`mui-button-${variant}`}
         >
           {children}
         </button>
       ),
     };
   });
   ```

3. **Jest Factory Limitations**: You cannot reference variables from the outer scope in a Jest mock factory. Instead, use a simplified mock component or create a dedicated mock file.

4. **Testing Next.js Server Components**: For server components, create a simplified test that focuses on the rendered output rather than implementation details.

5. **Type Definitions**: The `setup.ts` file and global type declarations in `types.d.ts` help with TypeScript errors for testing.

## Writing New Tests

When writing new tests:

1. Create a file with the `.spec.tsx` extension in this directory
2. Import `@testing-library/jest-dom` in your test file
3. Follow the existing patterns for mocking dependencies
4. Use `data-testid` attributes for targeting elements in tests
5. Ensure proper cleanup between tests with `beforeEach` and `afterEach` hooks

## Mocking Guidelines

- Mock external dependencies like Next.js components, Material UI, etc.
- Mock API calls and server actions
- For server components, ensure you're testing what gets rendered, not implementation details
- Provide realistic test data that matches the expected shape

## Best Practices

- Test behavior, not implementation details
- Use test-ids for targeting elements in your tests
- Keep tests focused and minimal
- Avoid testing third-party libraries
- Test error states and edge cases
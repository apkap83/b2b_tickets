# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a B2B ticketing system built as an Nx monorepo. The system consists of multiple applications:

- `b2b_tickets`: The main Next.js web application
- `socket-server`: A WebSocket server for real-time communication

## Common Commands

### Development

```bash
# Start both the main application and socket server in development mode (using concurrently)
npm run dev

# Alternative ways to run both services together
npm run dev        # Uses concurrently in package.json
./scripts/run-dev.sh  # Uses concurrently from script file

# Start just the main application in development mode
npm run dev:web
# or
nx dev b2b_tickets

# Start the main application on a specific port
nx dev b2b_tickets -p 3500

# Start just the socket server in development mode
npm run dev:socket
# or manually:
export DEBUG=1
export NODE_ENV=development
export PORT=3455
export SOCKET_CORS_ORIGIN=http://127.0.0.1:3000
export NEXT_AUTH_SESSION_URL=http://127.0.0.1:3000/api/auth/session
export NODE_TLS_REJECT_UNAUTHORIZED=0
nx serve socket-server
```

### Building

```bash
# Build the main application for production
nx build b2b_tickets

# Build the socket server for staging
nx build socket-server --configuration=staging --verbose

# Build the socket server for production
nx build socket-server --configuration=production --verbose
```

### Testing

```bash
# Run tests for a specific library with coverage and watch mode
nx test config --coverage --verbose --watch
nx test utils --coverage --verbose --watch

# Run unit tests for all projects with test targets
npm run test:unit

# Run all tests in the monorepo
npm run test:all

# Run E2E tests with Playwright
cd apps/b2b_tickets-e2e
npx playwright test --project chromium

# Run E2E tests in headless mode (already configured)
cd apps/b2b_tickets-e2e
npm run test:headless

# Skip browser tests completely (useful for CI environments without browsers)
cd apps/b2b_tickets-e2e
npm run test:skip

# Run tests with mock data (no server needed)
cd apps/b2b_tickets-e2e
npm run test:mock

# Run only the working mock tests
cd apps/b2b_tickets-e2e
npm run test:mock-only

# Run tests in debug mode with UI
cd apps/b2b_tickets-e2e
npm run test:debug

# Or using nx
nx run b2b_tickets-e2e:e2e
nx run b2b_tickets-e2e:e2e --configuration=headless
nx run b2b_tickets-e2e:e2e --configuration=skip
nx run b2b_tickets-e2e:e2e --configuration=mock
nx run b2b_tickets-e2e:e2e --configuration=debug
nx run b2b_tickets-e2e:e2e --configuration=mock-only

# Or using npm scripts from the root directory
npm run test:e2e
npm run test:e2e:headless
npm run test:e2e:skip
npm run test:e2e:mock
npm run test:e2e:debug
npm run test:e2e:mock-only
```

### Running Tasks with Nx

```bash
# Run a single task for a project
npx nx <target> <project> <...options>

# Run multiple targets
npx nx run-many -t <target1> <target2>

# Run multiple targets for specific projects
npx nx run-many -t <target1> <target2> -p <proj1> <proj2>

# Show the project graph
npx nx graph
```

### Docker Commands

```bash
# Build the base image for macOS
sudo docker build --build-arg USE_PROXY=false -t my-monorepo-base -f Dockerfile .

# Build containers with docker-compose
docker compose up --build

# Build and start a specific service
sudo docker compose up -d --build --no-cache --remove-orphans staging_b2b_tickets_pre_entry_1

# Clean up unused Docker resources
sudo docker system prune -a -f --volumes
```

## Project Architecture

### Application Structure

The project follows the Nx monorepo architecture with:

1. **Apps Directory** - Contains the main applications:
   - `b2b_tickets`: Next.js web application for the ticketing system
   - `socket-server`: Node.js WebSocket server for real-time updates

2. **Libs Directory** - Contains shared libraries:
   - `admin-server-actions`: Server-side admin operations
   - `assets`: Shared assets like logos and images
   - `auth-options`: Authentication configuration
   - `config`: Environment configuration
   - `contexts`: React contexts for state management
   - `db-access`: Database access layer using Sequelize
   - `email-service`: Email functionality
   - `logging`: Logging utilities
   - `react-hooks`: Custom React hooks
   - `redis-service`: Redis caching service
   - `server-actions`: General server actions
   - `shared-models`: Shared data models
   - `tickets`: Ticket-related components
   - `totp-service`: Time-based One-Time Password service
   - `ui`: Shared UI components
   - `ui-theme`: Theme configuration
   - `utils`: Utility functions

### Authentication & Security System

The project uses NextAuth.js for authentication with enterprise-grade security:
- TOTP (Time-based One-Time Password) support
- Email-based password reset with JWT token validation
- Role-based access control (RBAC) with permission validation
- **Timing Attack Protection**: Response times consistent (~2ms difference) to prevent user enumeration
- **JWT Security**: Comprehensive token validation with structure, signature, and expiration checks
- **Session Security**: Token tampering detection and secure cookie management
- **File Upload Security**: Protection against malicious files, size limits, and path traversal
- **SQL Injection Prevention**: Parameterized queries and input sanitization
- **CSRF Protection**: Origin validation and anti-CSRF token requirements
- **Rate Limiting**: Brute force protection on authentication endpoints

### Database

- PostgreSQL database with Sequelize as the ORM
- Database migrations handled via Sequelize

### Frontend

- Next.js application with both client and server components
- MUI (Material UI) for component library
- Tailwind CSS for styling

### Real-time Communication

- Socket.IO for real-time updates via WebSockets
- Separate socket-server application to handle socket connections

### Deployment

- Docker-based deployment with multiple containers
- Support for staging and production environments
- Redis for session storage and caching

## Testing Infrastructure

### Comprehensive Test Coverage (477+ tests, 100% success rate)

The project maintains extensive test coverage across multiple domains:

#### 1. Server Actions Testing (`libs/server-actions/src/__tests__/`)
- **68 tests** covering ticket operations, file handling, admin functions
- Test files: `createNewTicket.test.ts`, `ticketQueries.test.ts`, `security.test.ts`, `fileOperations.test.ts`
- Covers: Authentication, authorization, database operations, file uploads/downloads
- Key security tests for role-based access control (RBAC)

#### 2. API Routes Testing (`apps/b2b_tickets/specs/api/`)
- **7 tests** for authentication and ticket management endpoints
- Test files: `simple-api.test.ts`, `captcha-standalone.test.ts`
- Includes Next.js API route testing with proper request/response mocking

#### 3. Database Operations Testing (`libs/db-access/src/test/`)
- **38 tests** for schema validation, data consistency, transaction integrity
- Test files: `database-schema.test.ts`, `data-consistency.test.ts`, `transaction-integrity.test.ts`
- Covers: PostgreSQL schema validation, ACID compliance, concurrent operations

#### 4. Security Testing (`libs/security-tests/`)
- **55 comprehensive security tests** across 6 test suites
- **Authentication & Authorization**: Role-based access control, permission validation
- **Password & TOTP Security**: Complexity requirements, rate limiting, brute force protection
- **Session Security**: Hijacking prevention, JWT validation, timeout management
- **Vulnerability Prevention**: SQL injection, XSS, CSRF protection
- **Test files**: 
  - `authentication-bypass.test.ts` - Critical admin TOTP bypass vulnerability testing
  - `authorization-bypass.test.ts` - RBAC and permission testing
  - `password-totp-security.test.ts` - Authentication security
  - `session-security.test.ts` - Session management security
  - `vulnerability-prevention.test.ts` - Common web vulnerability prevention
  - `basic.test.ts` - Security test utilities validation

#### 5. Additional Test Suites
- **Config Tests**: 116 tests for environment configuration
- **Utils Tests**: 155 tests for utility functions and React components
- **Auth Options Tests**: 25 tests for authentication logic
- **Redis Service Tests**: 3 tests for Redis operations
- **Main App Tests**: 31 tests for React components and UI

### Security Features & Fixes

#### Critical Security Issue Resolved: Admin TOTP Bypass
- **Location**: `/libs/auth-options/src/lib/auth-options.ts` (lines 408-431)
- **Fix Applied**: Enhanced admin TOTP bypass with proper role validation and audit logging
- **Security Enhancement**: Only users with actual Admin role can use bypass functionality
- **Audit logging**: All admin bypass usage is logged with user_id, customer_id, and IP address

#### Documented Vulnerabilities (for awareness):
1. **Bulk User Update Security Issue** (HIGH priority) - Updates all users with same email during login attempts
2. **User Enumeration via Response Timing** - Potential timing attack vulnerability
3. **Information Disclosure in Error Messages** - Sensitive data may leak in error responses

### Test Execution Commands

```bash
# Run all tests (477+ tests)
npm run test:all

# Run specific test suites
nx run server-actions:test --detectOpenHandles
nx run security-tests:test --detectOpenHandles  
nx run db-access:test --detectOpenHandles
nx run b2b_tickets:test --detectOpenHandles

# Run E2E tests (mock environment)
npm run test:e2e:mock-only
```

### Security Testing Best Practices

1. **Mock Implementations**: Comprehensive mocking for Redis, database, and authentication services
2. **Security Test Utils**: Centralized utilities for creating mock users, sessions, and attack payloads
3. **Vulnerability Coverage**: Tests cover OWASP Top 10 and common security issues
4. **Rate Limiting**: Implemented and tested across authentication and API endpoints
5. **Session Management**: Secure session handling with hijacking prevention and timeout controls
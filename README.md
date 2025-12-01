## B2B Tickets - Project Overview

This is a B2B ticketing system built as an Nx monorepo. The system consists of multiple applications:

- `b2b_tickets`: The main Next.js web application
- `socket-server`: A WebSocket server for real-time communication

### Key Features

- B2B ticketing system built with modern web technologies
- Nx monorepo architecture enabling code sharing and modularity
- Next.js application with server and client components
- Separate WebSocket server for real-time updates
- PostgreSQL database with Sequelize ORM
- Well-organized library structure with clear separation of concerns
- Secure authentication with NextAuth.js and TOTP (Time-based One-Time Password)
- Modern frontend stack (React, Material UI, Tailwind CSS, DaisyUI)
- Docker-based deployment with support for both staging and production
- Comprehensive testing setup with Jest and Playwright

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
   - `security-tests`: Comprehensive security testing suite

### Authentication & Security System

The project uses NextAuth.js for authentication with comprehensive security protections:

#### Authentication Features
- TOTP (Time-based One-Time Password) support
- Email-based password reset
- Role-based access control (RBAC) with Admin bypass functionality

#### Security Protections
- **Timing Attack Protection**: Consistent response times prevent user enumeration
- **JWT Security**: Comprehensive token validation and tampering detection
- **Session Security**: Hijacking prevention and secure timeout controls
- **File Upload Security**: Malicious file detection, type validation, path traversal prevention
- **SQL Injection Prevention**: Parameterized queries and input sanitization
- **CSRF Protection**: Cross-site request forgery prevention
- **Rate Limiting**: Protection against brute force attacks on authentication endpoints
- **Data Isolation**: Customer data segregation with cross-customer access prevention

### Database

- PostgreSQL database with Sequelize as the ORM
- Database migrations handled via Sequelize

### Frontend

- Next.js application with both client and server components
- MUI (Material UI) for component library
- Tailwind CSS for utility-first styling
- DaisyUI for additional component styling and themes

### Real-time Communication

- Socket.IO for real-time updates via WebSockets
- Separate socket-server application to handle socket connections

### Deployment

- Docker-based deployment with multiple containers
- Support for staging and production environments
- Redis for session storage and caching

## Common Commands

### Development

```bash
# Start both applications together (recommended)
npm run dev

# Start the main application in development mode
nx dev b2b_tickets

# Start the main application on a specific port
nx dev b2b_tickets -p 3500

# Start the socket server in development mode
npm run dev:socket
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

The project maintains comprehensive test coverage with 540+ tests achieving 100% success rate:

#### Test Suites
- **Security Tests** (115 tests): Authentication, authorization, file upload security, vulnerability prevention
- **Server Actions Tests** (68 tests): Ticket operations, file handling, admin functions
- **Admin Server Actions Tests** (65 tests): User management, role/permission management, company management, admin dashboard functionality
- **Database Tests** (38 tests): Schema validation, transaction integrity, data consistency
- **API Routes Tests** (7 tests): Authentication and ticket management endpoints
- **Component Tests** (247+ tests): Utils, config, auth options, Redis service, React components

```bash
# Run all tests in the monorepo
npm run test:all

# Run specific test suites
nx run server-actions:test --detectOpenHandles
nx run admin-server-actions:test --detectOpenHandles
nx run security-tests:test --detectOpenHandles  
nx run db-access:test --detectOpenHandles

# Run tests for a specific library with coverage and watch mode
nx test config --coverage --verbose --watch
nx test utils --coverage --verbose --watch

# Run E2E tests with Playwright
cd apps/b2b_tickets-e2e
npx playwright test --project chromium

# Run E2E tests in mock mode (no server needed)
npm run test:e2e:mock-only

# Or using nx
nx run b2b_tickets-e2e:e2e
nx run b2b_tickets-e2e:e2e --configuration=mock-only
```

### Project Visualization

```bash
# Show the project graph
npx nx graph
```

### Docker Commands

```bash
# Build and start all services
docker compose up --build

# Build and start specific services
docker compose up --build staging_b2b_tickets_pre_entry_1 staging_socket_server_pre_entry_1

# Start staging services in detached mode
docker compose up -d staging_b2b_tickets_pre_entry_1 staging_b2b_tickets_pre_entry_2 staging_socket_server_pre_entry_1

# Start production services
docker compose up -d prod_b2b_tickets_1 prod_b2b_tickets_2 production_socket_server_1

# View logs for specific service
docker compose logs -f staging_b2b_tickets_pre_entry_1

# Stop all services
docker compose down

# Clean up unused Docker resources
docker system prune -a -f --volumes
```

## Development Tools & Commands

### Creating New Libraries and Components

```bash
# Create a new library under libs folder
nx g lib library-name --directory libs --tags type:utils,scope:shared

# Create a UI library
nx g lib --directory libs --appProject b2b_tickets --tags type:ui,scope:b2b_tickets

# Create a Next.js library  
nx g @nx/next:library library-name --directory libs --tags type:server,scope:b2b_tickets

# Create a component in existing library
nx g component ComponentName --project ui --export --tags type:ui,scope=b2b_tickets

# Create a Node.js application
nx generate @nx/node:application app-name --verbose
```

### Database & Models

```bash
# Generate Sequelize models automatically for entire database
npx sequelize-auto -o "./models" -d postgres -h 127.0.0.1 -p 9002 -u postgres -x postgres -s 'b2btickets_dev' --dialect postgres -l ts

# Generate specific table model
npx sequelize-auto -o "./models" -d postgres -h 127.0.0.1 -p 9002 -u postgres -x postgres -s 'b2btickets_dev' --dialect postgres -l ts
```

### Project Analysis

```bash
# Show project dependency graph
nx graph

# Get project information
nx show project socket-server

# Generate project report
nx report

# Count lines of code (requires cloc)
cloc . --exclude-dir=node_modules,.next,coverage,playwright-report --exclude-ext=json,lock,yaml --include-lang=TypeScript,JSX,JavaScript,SQL,SCSS,CSS,HTML
```

### Socket Server Environments

```bash
# Development mode (already handled by npm scripts)
npm run dev:socket

# Manual staging build and run
export DEBUG=1 NODE_ENV=staging PORT=3456
nx build socket-server --configuration=staging --verbose
node dist/apps/socket-server/main.js

# Manual production build and run  
export DEBUG=1 NODE_ENV=production PORT=3457
nx build socket-server --configuration=production --verbose
node dist/apps/socket-server/main.js
```

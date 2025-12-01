## B2B Tickets - Project Overview

This is a B2B ticketing system built as an Nx monorepo. The system consists of multiple applications:

- `b2b_tickets`: The main Next.js web application
- `socket-server`: A WebSocket server for real-time communication

### Key Features

- **Enterprise B2B Ticketing System** built with modern web technologies and advanced security
- **Multi-Tenant Architecture** supporting users with multiple company accounts and cross-tenant management
- **Nx Monorepo** architecture enabling code sharing, modularity, and enterprise-scale development
- **Next.js Application** with server and client components for optimal performance and SEO
- **Real-Time Communication** via separate WebSocket server for instant updates and notifications
- **PostgreSQL Database** with Sequelize ORM and enterprise-grade data integrity protection
- **Enterprise Security** with NextAuth.js, TOTP/2FA, advanced RBAC, and comprehensive audit trails
- **Modern Frontend Stack** (React, Material UI, Tailwind CSS, DaisyUI) with responsive design
- **Docker Deployment** with support for staging, production, and multi-environment configurations
- **Comprehensive Testing** (542+ tests) including security, integration, and E2E testing with Playwright

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

### Enterprise-Grade Authentication & Security System

The project uses NextAuth.js for authentication with comprehensive enterprise-level security:

#### Advanced Authentication Features
- **Multi-Tenant User Federation**: Single users can manage multiple company accounts with synchronized operations
- **TOTP/2FA Authentication**: Time-based One-Time Password support with enterprise admin bypass capabilities
- **Advanced RBAC**: Role-based access control with cross-company user management and granular permissions
- **Email-based Authentication**: Secure password reset with JWT validation and multi-account support

#### Enterprise Security Protections
- **Multi-Tenant Architecture**: Sophisticated user federation supporting cross-company account management
- **Timing Attack Protection**: Consistent response times prevent user enumeration attacks
- **JWT Security**: Comprehensive token validation, tampering detection, and secure session management
- **Session Security**: Hijacking prevention, secure timeout controls, and cross-tenant isolation
- **File Upload Security**: Malicious file detection, type validation, size limits, and path traversal prevention
- **SQL Injection Prevention**: Parameterized queries, input sanitization, and database security
- **CSRF Protection**: Cross-site request forgery prevention with origin validation
- **Rate Limiting**: Advanced protection against brute force attacks on authentication endpoints
- **Data Isolation**: Customer data segregation with cross-customer access prevention
- **Database Integrity**: Foreign key constraint validation and complete referential integrity protection
- **Audit & Compliance**: Complete audit trails, security event logging, and compliance-ready features

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

The project maintains comprehensive test coverage with 542+ tests achieving 100% success rate:

#### Test Suites
- **Security Tests** (115 tests): Authentication, authorization, file upload security, vulnerability prevention
- **Server Actions Tests** (68 tests): Ticket operations, file handling, admin functions
- **Admin Server Actions Tests** (67 tests): User management, role/permission management, company management, admin dashboard functionality, database integrity testing
- **Database Tests** (38 tests): Schema validation, transaction integrity, data consistency
- **API Routes Tests** (7 tests): Authentication and ticket management endpoints
- **Component Tests** (245+ tests): Utils, config, auth options, Redis service, React components

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

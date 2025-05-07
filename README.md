## B2B Tickets - Project Overview

This is a B2B ticketing system built as an Nx monorepo. The system consists of multiple applications:

- `b2b_tickets`: The main Next.js web application
- `socket-server`: A WebSocket server for real-time communication

## Common Commands

### Development

```bash
# Start the main application in development mode
nx dev b2b_tickets

# Start the main application on a specific port
nx dev b2b_tickets -p 3500

# Start the socket server in development mode
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

# Run E2E tests with Playwright
cd apps/b2b_tickets-e2e
npx playwright test --project chromium

# Or using nx
nx run b2b_tickets-e2e:e2e
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

### Authentication System

The project uses NextAuth.js for authentication with:

- TOTP (Time-based One-Time Password) support
- Email-based password reset
- Role-based access control

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

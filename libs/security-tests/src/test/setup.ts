/**
 * Security Test Setup
 * 
 * Configures testing environment for comprehensive security testing including:
 * - Authentication bypass testing
 * - Authorization vulnerabilities
 * - Session security
 * - Input validation
 * - RBAC testing
 */

// Mock environment variables for security testing
process.env['NODE_ENV'] = 'test';
process.env['NEXTAUTH_SECRET'] = 'test-secret-key';
process.env['NEXTAUTH_URL'] = 'http://localhost:3000';

// Global security testing setup
beforeAll(async () => {
  // Initialize security test environment
});

afterAll(async () => {
  // Cleanup security test resources
});

// Mock authentication dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@b2b-tickets/auth-options', () => ({
  tryLocalAuthentication: jest.fn(),
  performPasswordReset: jest.fn(),
}));

jest.mock('@b2b-tickets/db-access', () => ({
  B2BUser: {
    scope: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  AppRole: {
    findAll: jest.fn(),
  },
  AppPermission: {
    findAll: jest.fn(),
  },
  pgB2Bpool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
  setSchemaAndTimezone: jest.fn(),
}));

jest.mock('@b2b-tickets/redis-service', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

jest.mock('@b2b-tickets/logging', () => ({
  CustomLogger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  })),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('$2b$10$mocked.hash'),
}));
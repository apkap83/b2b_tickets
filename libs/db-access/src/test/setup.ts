/**
 * Database Test Setup
 * 
 * Configures testing environment for database operations including:
 * - Test database connection
 * - Transaction management 
 * - Data cleanup
 * - Mock configurations
 */

import { Pool, PoolClient } from 'pg';
import { Sequelize } from 'sequelize-typescript';

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test';
process.env['POSTGRES_B2B_PASSWORD'] = 'test-password';

// Create test database connection pool
export const createTestPool = () => {
  return new Pool({
    user: 'test-user',
    password: 'test-password',
    host: 'localhost',
    port: 5432,
    database: 'test-db',
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
};

// Mock database pool for testing
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
};

// Mock client for database operations
const mockClient: PoolClient = {
  query: jest.fn(),
  release: jest.fn(),
  // Add other PoolClient methods as needed
} as unknown as PoolClient;

// Mock Sequelize for testing
export const createMockSequelize = () => {
  return {
    authenticate: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
    transaction: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    define: jest.fn(),
    sync: jest.fn().mockResolvedValue(undefined),
    drop: jest.fn().mockResolvedValue(undefined),
  } as unknown as Sequelize;
};

// Database test utilities
export class DatabaseTestUtils {
  private static pool: Pool;
  private static sequelize: Sequelize;

  static async setupTestDatabase() {
    // In a real scenario, this would connect to a test database
    // For now, we'll use mocks to avoid requiring a real database connection
    this.pool = mockPool as unknown as Pool;
    this.sequelize = createMockSequelize();
  }

  static async cleanupTestDatabase() {
    if (this.sequelize) {
      await this.sequelize.close();
    }
    if (this.pool) {
      await this.pool.end();
    }
  }

  static getTestPool(): Pool {
    return this.pool;
  }

  static getTestSequelize(): Sequelize {
    return this.sequelize;
  }

  // Utility to create test data
  static createTestCustomer() {
    return {
      customer_id: 1,
      customer_name: 'Test Customer',
      customer_code: 'TEST001',
      record_version: 1,
      creation_date: new Date(),
      last_update_date: new Date(),
    };
  }

  static createTestUser() {
    return {
      user_id: 1,
      customer_id: 1,
      username: 'testuser',
      password: '$2b$10$hashedpassword',
      change_password: false,
      is_locked: false,
      last_login_status: 'success',
      last_login_failed_attempts: 0,
      record_version: 1,
      creation_date: new Date(),
      last_update_date: new Date(),
    };
  }

  static createTestTicket() {
    return {
      ticket_id: 1,
      customer_id: 1,
      ticket_number: 'TCK-001',
      open_user_id: 1,
      status_user_id: 1,
      close_user_id: null,
      record_version: 1,
      creation_date: new Date(),
      last_update_date: new Date(),
    };
  }
}

// Global setup and teardown
beforeAll(async () => {
  await DatabaseTestUtils.setupTestDatabase();
});

afterAll(async () => {
  await DatabaseTestUtils.cleanupTestDatabase();
});

// Setup mocks for database-related modules
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPool),
}));

jest.mock('sequelize-typescript', () => ({
  Sequelize: jest.fn().mockImplementation(() => createMockSequelize()),
}));

// Mock config to avoid dependency issues
jest.mock('@b2b-tickets/config', () => ({
  config: {
    postgres_b2b_database: {
      username: 'test-user',
      host: 'localhost',
      port: 5432,
      db: 'test-db',
      maxConnections: 5,
      applicationName: 'test-app',
      connectionTimeout: 5000,
      idleTimeout: 10000,
      schemaName: 'test-schema',
      applicationNameSequelize: 'test-sequelize',
    },
    TimeZone: 'Europe/Athens',
  },
}));

// Mock logging to avoid dependency issues
jest.mock('@b2b-tickets/logging', () => ({
  sequelizeDBActionsLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

export { mockPool, mockClient };
/**
 * API Route Test Setup
 * Comprehensive mocking and utilities for testing Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { Session, AppRoleTypes, AppPermissionTypes } from '@b2b-tickets/shared-models';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Next.js edge runtime functions
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      statusText: init?.statusText || 'OK',
      json: async () => data,
      headers: new Headers(init?.headers),
    })),
    redirect: jest.fn((url, status) => ({
      status: status || 302,
      headers: new Headers({ Location: url }),
    })),
  },
}));

// Mock database connections
jest.mock('@b2b-tickets/db-access', () => ({
  pgB2Bpool: {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  },
  setSchemaAndTimezone: jest.fn(),
}));

// Mock Redis service
jest.mock('@b2b-tickets/redis-service', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
  },
}));

// Mock config
jest.mock('@b2b-tickets/config', () => ({
  config: {
    nextAuthSecret: 'test-secret',
    recaptcha: {
      secretKey: 'test-recaptcha-secret',
      v3SecretKey: 'test-recaptcha-v3-secret',
    },
    api: {
      user: 'test-user',
      process: 'test-process',
    },
    postgres_b2b_database: {
      debugMode: false,
      schemaName: 'test_schema',
    },
    cookieConsentValidityInDays: 365,
    attachmentsPrefixPath: '/test/attachments',
    smtp: {
      host: 'test-smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@example.com',
        pass: 'test-password',
      },
    },
  },
}));

// Mock TOTP service
jest.mock('@b2b-tickets/totp-service', () => ({
  generateTOTPSecret: jest.fn(() => 'TEST_SECRET'),
  generateTOTPToken: jest.fn(() => '123456'),
  verifyTOTPToken: jest.fn(() => true),
}));

// Mock email service
jest.mock('@b2b-tickets/email-service/server', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendEmailOnTicketUpdate: jest.fn(),
}));

// Mock logging
jest.mock('@b2b-tickets/logging', () => ({
  CustomLogger: class MockLogger {
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
  },
}));

// Mock auth options
jest.mock('@b2b-tickets/auth-options', () => ({
  options: {
    secret: 'test-secret',
    providers: [],
    callbacks: {},
  },
}));

// Mock crypto functions
global.crypto = {
  ...global.crypto,
  randomUUID: jest.fn(() => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') as any,
  subtle: {
    ...global.crypto?.subtle,
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    generateKey: jest.fn(),
    importKey: jest.fn(),
  } as any,
};

// Mock fetch for external API calls (reCAPTCHA, etc.)
global.fetch = jest.fn();

// Test utilities
export class APITestUtils {
  /**
   * Creates a mock NextRequest with the specified parameters
   */
  static createMockRequest(options: {
    method?: string;
    url?: string;
    body?: any;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}): NextRequest {
    const {
      method = 'GET',
      url = 'http://localhost:3000/api/test',
      body,
      headers = {},
      cookies = {},
    } = options;

    const request = {
      method,
      url,
      nextUrl: new URL(url),
      headers: new Headers(headers),
      cookies: {
        get: jest.fn((name: string) => cookies[name] ? { value: cookies[name] } : undefined),
        set: jest.fn(),
        delete: jest.fn(),
      },
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
      formData: jest.fn(),
      clone: jest.fn(),
    } as unknown as NextRequest;

    return request;
  }

  /**
   * Creates a mock session for testing authenticated endpoints
   */
  static createMockSession(overrides: Partial<Session> = {}): Session {
    return {
      user: {
        id: 'test-user-123',
        user_id: 123,
        userName: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        customer_id: 1,
        customer_name: 'Test Company',
        mobilePhone: '+1234567890',
        authenticationType: 'LOCAL',
        roles: ['B2B_TicketCreator'],
        permissions: [
          { 
            permissionName: AppPermissionTypes.Create_New_Ticket,
            permissionEndPoint: '/api/tickets',
            permissionDescription: 'Create new tickets'
          },
          { 
            permissionName: AppPermissionTypes.Tickets_Page,
            permissionEndPoint: '/tickets',
            permissionDescription: 'View tickets page'
          },
        ],
        ...overrides.user,
      },
      expires: '2025-01-01T00:00:00.000Z',
      ...overrides,
    } as Session;
  }

  /**
   * Creates a mock admin session for testing admin endpoints
   */
  static createMockAdminSession(overrides: Partial<Session> = {}): Session {
    return this.createMockSession({
      user: {
        id: 'admin-user-1',
        user_id: 1,
        userName: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        customer_id: 1,
        customer_name: 'Test Company',
        mobilePhone: '+1234567890',
        authenticationType: 'LOCAL',
        roles: ['Admin'] as AppRoleTypes[],
        permissions: [
          { 
            permissionName: AppPermissionTypes.API_Admin,
            permissionEndPoint: '/api/admin',
            permissionDescription: 'Admin API access'
          },
          { 
            permissionName: AppPermissionTypes.Create_New_App_User,
            permissionEndPoint: '/api/users',
            permissionDescription: 'Create new users'
          },
          { 
            permissionName: AppPermissionTypes.Edit_User,
            permissionEndPoint: '/api/users',
            permissionDescription: 'Edit users'
          },
        ],
        ...overrides.user,
      },
      ...overrides,
    });
  }

  /**
   * Mocks a successful database query response
   */
  static mockDatabaseQuery(result: any = { rows: [], rowCount: 0 }) {
    const { pgB2Bpool } = require('@b2b-tickets/db-access');
    (pgB2Bpool.query as jest.MockedFunction<any>).mockResolvedValue(result);
    return result;
  }

  /**
   * Mocks a database error
   */
  static mockDatabaseError(error: Error = new Error('Database connection failed')) {
    const { pgB2Bpool } = require('@b2b-tickets/db-access');
    (pgB2Bpool.query as jest.MockedFunction<any>).mockRejectedValue(error);
    return error;
  }

  /**
   * Mocks Redis operations
   */
  static mockRedisOperations(responses: { [key: string]: any } = {}) {
    const { redisClient } = require('@b2b-tickets/redis-service');
    Object.keys(responses).forEach(operation => {
      (redisClient[operation] as jest.MockedFunction<any>).mockResolvedValue(responses[operation]);
    });
  }

  /**
   * Mocks fetch responses for external APIs
   */
  static mockFetchResponse(response: { ok: boolean; json?: any; text?: string; status?: number }) {
    (global.fetch as jest.MockedFunction<any>).mockResolvedValue({
      ok: response.ok,
      status: response.status || (response.ok ? 200 : 400),
      json: jest.fn().mockResolvedValue(response.json),
      text: jest.fn().mockResolvedValue(response.text || ''),
    });
  }

  /**
   * Asserts that a NextResponse has the expected properties
   */
  static async assertResponse(
    response: any,
    expected: {
      status?: number;
      data?: any;
      headers?: Record<string, string>;
    }
  ) {
    if (expected.status) {
      expect(response.status).toBe(expected.status);
    }
    
    if (expected.data) {
      const data = await response.json();
      expect(data).toEqual(expected.data);
    }

    if (expected.headers) {
      Object.entries(expected.headers).forEach(([key, value]) => {
        expect(response.headers.get(key)).toBe(value);
      });
    }
  }
}

// Global test environment setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset environment variables (use Object.defineProperty for read-only properties)
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
  process.env.NEXTAUTH_SECRET = 'test-secret';
  
  // Reset global fetch mock
  (global.fetch as jest.MockedFunction<any>).mockClear();
});

export default APITestUtils;
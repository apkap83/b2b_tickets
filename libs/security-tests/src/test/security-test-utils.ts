/**
 * Security Testing Utilities
 * 
 * Provides utilities for comprehensive security testing including
 * mock data creation, vulnerability simulation, and security assertions
 */

export interface MockUser {
  user_id: number;
  customer_id: number;
  username: string;
  email: string;
  password: string;
  is_locked: string;
  is_active: string;
  last_login_failed_attempts: number;
  last_login_status: string;
  authentication_type: string;
  change_password: string;
  mfa_method: string;
  two_factor_secret?: string;
  AppRoles?: MockRole[];
  save: jest.MockedFunction<any>;
}

export interface MockRole {
  id: number;
  roleName: string;
  AppPermissions: MockPermission[];
}

export interface MockPermission {
  id: number;
  permissionName: string;
  endPoint: string;
  description: string;
}

export interface MockSession {
  user: {
    user_id: number;
    userName: string;
    email: string;
    customer_id: number;
    roles: string[];
    permissions: { permissionName: string }[];
  };
}

export class SecurityTestUtils {
  
  /**
   * Creates a mock user with security-relevant properties
   */
  static createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
      user_id: 1,
      customer_id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: '$2b$10$mockedhashedpassword',
      is_locked: 'n',
      is_active: 'y',
      last_login_failed_attempts: 0,
      last_login_status: 's',
      authentication_type: 'local',
      change_password: 'n',
      mfa_method: 'email',
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  /**
   * Creates a mock admin user
   */
  static createMockAdminUser(overrides: Partial<MockUser> = {}): MockUser {
    return this.createMockUser({
      username: 'admin',
      AppRoles: [{
        id: 1,
        roleName: 'Admin',
        AppPermissions: [
          { id: 1, permissionName: 'API_Admin', endPoint: '*', description: 'Full admin access' }
        ]
      }],
      ...overrides,
    });
  }

  /**
   * Creates a mock session with specified roles and permissions
   */
  static createMockSession(
    roles: string[] = ['User'], 
    permissions: string[] = [],
    overrides: Partial<MockSession['user']> = {}
  ): MockSession {
    return {
      user: {
        user_id: 1,
        userName: 'testuser',
        email: 'test@example.com',
        customer_id: 1,
        roles,
        permissions: permissions.map(p => ({ permissionName: p })),
        ...overrides,
      }
    };
  }

  /**
   * Creates a mock admin session
   */
  static createMockAdminSession(overrides: Partial<MockSession['user']> = {}): MockSession {
    return this.createMockSession(
      ['Admin'],
      ['API_Admin'],
      { userName: 'admin', ...overrides }
    );
  }

  /**
   * Simulates timing attack by introducing variable delays
   */
  static async simulateTimingAttack(validUser: boolean): Promise<void> {
    // Real systems should have consistent timing
    const delay = validUser ? Math.random() * 50 + 50 : Math.random() * 200 + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generates common SQL injection payloads for testing
   */
  static getSqlInjectionPayloads(): string[] {
    return [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users (username) VALUES ('hacker'); --",
      "' OR 1=1 --",
      "admin'--",
      "admin' /*",
      "' or 1=1#",
      "' or 1=1--",
      "') or ('1'='1--",
    ];
  }

  /**
   * Generates XSS payloads for testing
   */
  static getXssPayloads(): string[] {
    return [
      "<script>alert('XSS')</script>",
      "javascript:alert('XSS')",
      "<img src=x onerror=alert('XSS')>",
      "<svg/onload=alert('XSS')>",
      "';alert('XSS');//",
      "<iframe src='javascript:alert(`XSS`)'></iframe>",
    ];
  }

  /**
   * Generates LDAP injection payloads
   */
  static getLdapInjectionPayloads(): string[] {
    return [
      "*)(uid=*",
      "*)(|(uid=*",
      "*))%00",
      "admin)(&(password=*)",
      "*)(objectClass=*",
    ];
  }

  /**
   * Creates mock Redis responses for rate limiting tests
   */
  static createMockRedisForRateLimit(currentAttempts: number = 0) {
    return {
      get: jest.fn().mockResolvedValue(currentAttempts > 0 ? currentAttempts.toString() : null),
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(currentAttempts + 1),
      expire: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    };
  }

  /**
   * Simulates brute force attack patterns
   */
  static getBruteForcePatterns(): string[] {
    return [
      'password123',
      'admin',
      'password',
      '123456',
      'qwerty',
      'letmein',
      'welcome',
      'monkey',
      'dragon',
      'master',
    ];
  }

  /**
   * Creates mock TOTP codes (both valid and invalid)
   */
  static createMockTotpCodes() {
    return {
      validCode: '12345',
      expiredCode: '54321',
      invalidCode: '00000',
      usedCode: '99999',
    };
  }

  /**
   * Simulates CAPTCHA responses
   */
  static createMockCaptchaResponses() {
    return {
      validToken: 'valid-captcha-token-12345',
      invalidToken: 'invalid-captcha-token',
      expiredToken: 'expired-captcha-token',
      emptyToken: '',
    };
  }

  /**
   * Creates mock JWT tokens for testing
   */
  static createMockJwtTokens() {
    return {
      validToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validpayload.validsignature',
      expiredToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expiredpayload.signature',
      malformedToken: 'malformed.token',
      emptyToken: '',
    };
  }

  /**
   * Validates that error messages don't reveal sensitive information
   */
  static validateSecureErrorMessage(errorMessage: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /hash/i,
      /secret/i,
      /token/i,
      /database/i,
      /internal/i,
      /stack trace/i,
      /file path/i,
      /server error/i,
    ];
    
    return !sensitivePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Simulates concurrent login attempts
   */
  static async simulateConcurrentLogins(
    count: number,
    loginFunction: () => Promise<any>
  ): Promise<any[]> {
    const promises = Array(count).fill(null).map(() => loginFunction());
    return Promise.allSettled(promises);
  }

  /**
   * Creates mock file upload data for security testing
   */
  static createMockFileUpload(malicious: boolean = false) {
    if (malicious) {
      return {
        filename: '../../../etc/passwd',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('root:x:0:0:root:/root:/bin/bash'),
      };
    }
    
    return {
      filename: 'test.txt',
      mimetype: 'text/plain',
      size: 100,
      buffer: Buffer.from('test file content'),
    };
  }

  /**
   * Validates customer data isolation
   */
  static validateCustomerIsolation(
    userCustomerId: number,
    dataCustomerId: number
  ): boolean {
    return userCustomerId === dataCustomerId;
  }

  /**
   * Creates scenarios for testing privilege escalation
   */
  static getPrivilegeEscalationScenarios() {
    return [
      {
        name: 'Role manipulation in session',
        sessionManipulation: { roles: ['Admin'] },
        expectedBlocked: true,
      },
      {
        name: 'Customer ID manipulation',
        sessionManipulation: { customer_id: -1 }, // Nova customer
        expectedBlocked: true,
      },
      {
        name: 'Permission injection',
        sessionManipulation: { permissions: [{ permissionName: 'API_Admin' }] },
        expectedBlocked: true,
      },
    ];
  }
}
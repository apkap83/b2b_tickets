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
(process.env as any)['NODE_ENV'] = 'test';
(process.env as any)['NEXTAUTH_SECRET'] = 'test-secret-key';
(process.env as any)['NEXTAUTH_URL'] = 'http://localhost:3000';

// Global security testing setup
beforeAll(async () => {
  // Initialize security test environment
});

afterAll(async () => {
  // Cleanup security test resources
});

// Reset mocks between tests
beforeEach(() => {
  // Reset all mock counters
  jest.clearAllMocks();
  
  // Reset rate limiting counters
  mockCounters.tokenAttempts = 0;
  mockCounters.otpAttempts = 0;
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
    findOne: jest.fn().mockImplementation((options) => {
      const email = options?.where?.email;
      const testEmail = (global as any).testUserEmail;
      
      // Only return a user for the valid test email
      if (email && (email === testEmail || (email.includes('security-test') && !email.includes("'") && !email.includes(';')))) {
        return Promise.resolve({
          user_id: 1,
          email: email,
          firstName: 'Security',
          lastName: 'Test',
          customer_id: 1,
        });
      }
      // Return null for invalid/malicious emails (this should trigger 400 response)
      return Promise.resolve(null);
    }),
    findAll: jest.fn(),
  },
  AppRole: {
    findAll: jest.fn(),
  },
  AppPermission: {
    findAll: jest.fn(),
  },
  pgB2Bpool: {
    query: jest.fn().mockImplementation((queryString, params) => {
      if (queryString.includes('COUNT(*)')) {
        return Promise.resolve({
          rows: [{ count: '1' }],
          rowCount: 1
        });
      }
      
      // Handle user verification query - return test user with dynamic email
      if (queryString.includes('SELECT email, firstName FROM users WHERE user_id')) {
        // Get the current test email from the global test context
        const currentTestEmail = (global as any).testUserEmail || 'security-test@example.com';
        return Promise.resolve({
          rows: [{ email: currentTestEmail, firstName: 'Security' }],
          rowCount: 1
        });
      }
      
      return Promise.resolve({
        rows: [{ user_id: 1, email: 'security-test@example.com', firstName: 'Security', lastName: 'Test', customer_id: 1 }],
        rowCount: 1
      });
    }),
    connect: jest.fn(),
  },
  setSchemaAndTimezone: jest.fn(),
}));

jest.mock('@b2b-tickets/redis-service', () => {
  let attemptCount = 0;
  return {
    redisClient: {
      get: jest.fn().mockImplementation((key) => {
        // Simulate rate limiting - return attempt count
        if (key.includes('token_attempts') || key.includes('otp_attempts')) {
          return Promise.resolve(attemptCount.toString());
        }
        return Promise.resolve(null);
      }),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockImplementation((key) => {
        // Simulate incrementing attempt count
        if (key.includes('token_attempts') || key.includes('otp_attempts')) {
          attemptCount++;
          return Promise.resolve(attemptCount);
        }
        return Promise.resolve(1);
      }),
      expire: jest.fn(),
    },
  };
});

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

jest.mock('@b2b-tickets/server-actions/server', () => ({
  getRequestLogger: jest.fn().mockResolvedValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Create a module-scoped object to persist counters across mock calls
const mockCounters = {
  tokenAttempts: 0,
  otpAttempts: 0,
};

jest.mock('@b2b-tickets/totp-service/server', () => {
  return {
    logTokenOTPAttempt: jest.fn().mockImplementation(() => {
      mockCounters.tokenAttempts++;
      return Promise.resolve({
        eligibleForNewOtpAttempt: mockCounters.tokenAttempts <= 3, // Allow 3 attempts before rate limiting
        remainingOTPAttempts: Math.max(0, 3 - mockCounters.tokenAttempts),
      });
    }),
    validateOTPCodeForUserThroughRedis: jest.fn().mockImplementation(() => {
      mockCounters.otpAttempts++;
      // Return object format that triggers rate limiting check in TOTP route
      return Promise.resolve({
        isValid: false,
        remainingOTPAttempts: Math.max(0, 3 - mockCounters.otpAttempts),
      });
    }),
    // Export reset function for tests
    __resetCounters: () => {
      mockCounters.tokenAttempts = 0;
      mockCounters.otpAttempts = 0;
    },
  };
});

jest.mock('@b2b-tickets/email-service/server', () => ({
  sendEmailForPasswordReset: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'test-message-id',
  }),
}));

jest.mock('@b2b-tickets/utils', () => ({
  generateResetToken: jest.fn().mockReturnValue('mock-reset-token-123'),
  symmetricEncrypt: jest.fn().mockReturnValue('encrypted-mock-token'),
  validateReCaptchaV3: jest.fn().mockResolvedValue({
    success: true,
    score: 0.9,
    action: 'submit',
    challenge_ts: new Date().toISOString(),
    hostname: 'localhost',
  }),
}));
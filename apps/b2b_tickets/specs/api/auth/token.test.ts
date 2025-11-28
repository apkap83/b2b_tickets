/**
 * Token API Route Tests
 * Tests for /api/auth/token endpoint (Password Reset Token Generation)
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/auth/token/route';
import { APITestUtils } from '../api-test-setup';

// Mock email service
const mockSendPasswordResetEmail = jest.fn();
jest.mock('@b2b-tickets/email-service/server', () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

// Mock Redis for rate limiting
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  exists: jest.fn(),
};

jest.mock('@b2b-tickets/redis-service', () => ({
  redisClient: mockRedisClient,
}));

// Mock crypto for token generation
const mockEncrypt = jest.fn();
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => Buffer.from('random-bytes')),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted'),
    final: jest.fn(() => 'token'),
  })),
}));

describe('/api/auth/token', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockSendPasswordResetEmail.mockResolvedValue(true);
    mockRedisClient.get.mockResolvedValue(null); // No previous attempts
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.exists.mockResolvedValue(0);
  });

  describe('POST', () => {
    it('should generate and send password reset token successfully', async () => {
      // Mock user found in database
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          email: 'test@example.com',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      // Mock successful token storage
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
        release: jest.fn(),
      };
      const { pgB2Bpool } = require('@b2b-tickets/db-access');
      pgB2Bpool.connect.mockResolvedValue(mockClient);

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 200,
        data: {
          success: true,
          message: 'Password reset email sent successfully'
        }
      });

      // Verify email was sent
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String), // encrypted token
        'testuser'
      );

      // Verify rate limiting was checked
      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    it('should handle missing email', async () => {
      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {}
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Email address is required'
        }
      });

      // Should not send email
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example.',
      ];

      for (const email of invalidEmails) {
        const request = APITestUtils.createMockRequest({
          method: 'POST',
          body: { email }
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('Invalid email format');
      }

      // Should not send any emails
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      // Mock user not found
      APITestUtils.mockDatabaseQuery({
        rows: [],
        rowCount: 0
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      // For security reasons, should return success even if user not found
      await APITestUtils.assertResponse(response, {
        status: 200,
        data: {
          success: true,
          message: 'Password reset email sent successfully'
        }
      });

      // But should not actually send email
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle locked user account', async () => {
      // Mock locked user
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          email: 'test@example.com',
          user_status: 'Active',
          user_locked: true
        }],
        rowCount: 1
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 403,
        data: {
          success: false,
          message: 'Account is locked. Please contact support.'
        }
      });

      // Should not send email for locked account
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle inactive user account', async () => {
      // Mock inactive user
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          email: 'test@example.com',
          user_status: 'Inactive',
          user_locked: false
        }],
        rowCount: 1
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 403,
        data: {
          success: false,
          message: 'Account is inactive. Please contact support.'
        }
      });

      // Should not send email for inactive account
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting per IP', async () => {
      // Mock too many attempts from same IP
      mockRedisClient.get.mockResolvedValue('5'); // 5 previous attempts

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 429,
        data: {
          success: false,
          message: 'Too many password reset attempts. Please try again later.'
        }
      });

      // Should not check database or send email
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting per email', async () => {
      // Mock existing token for same email
      mockRedisClient.exists.mockResolvedValue(1); // Token already exists

      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          email: 'test@example.com',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 429,
        data: {
          success: false,
          message: 'Password reset email already sent. Please check your email or wait before requesting another.'
        }
      });
    });

    it('should handle database errors', async () => {
      // Mock database error
      APITestUtils.mockDatabaseError(new Error('Database connection failed'));

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 500,
        data: {
          success: false,
          message: 'Internal server error. Please try again later.'
        }
      });
    });

    it('should handle email service failure', async () => {
      // Mock successful user lookup
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          email: 'test@example.com',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      // Mock successful token storage
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
        release: jest.fn(),
      };
      const { pgB2Bpool } = require('@b2b-tickets/db-access');
      pgB2Bpool.connect.mockResolvedValue(mockClient);

      // Mock email service failure
      mockSendPasswordResetEmail.mockRejectedValue(new Error('SMTP server unavailable'));

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 500,
        data: {
          success: false,
          message: 'Failed to send password reset email. Please try again later.'
        }
      });
    });

    it('should handle token storage failure', async () => {
      // Mock successful user lookup
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          email: 'test@example.com',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      // Mock token storage failure
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Failed to insert token')),
        release: jest.fn(),
      };
      const { pgB2Bpool } = require('@b2b-tickets/db-access');
      pgB2Bpool.connect.mockResolvedValue(mockClient);

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 500,
        data: {
          success: false,
          message: 'Failed to generate password reset token. Please try again later.'
        }
      });

      // Should not send email if token storage fails
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis failure
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      // Mock successful user lookup
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          email: 'test@example.com',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      // Mock successful token storage
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
        release: jest.fn(),
      };
      const { pgB2Bpool } = require('@b2b-tickets/db-access');
      pgB2Bpool.connect.mockResolvedValue(mockClient);

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      // Should still work even if Redis fails (graceful degradation)
      expect(response.status).toBe(200);
    });

    it('should sanitize email input', async () => {
      const maliciousEmails = [
        'test@example.com<script>alert("xss")</script>',
        'test@example.com"; DROP TABLE users; --',
        'test@example.com\n\nBCC: attacker@evil.com',
      ];

      for (const email of maliciousEmails) {
        const request = APITestUtils.createMockRequest({
          method: 'POST',
          body: { email }
        });

        const response = await POST(request);

        // Should either reject malicious input or sanitize it
        expect(response.status).toBeGreaterThanOrEqual(400);
        const data = await response.json();
        expect(data.success).toBe(false);
      }
    });

    it('should implement delay to prevent timing attacks', async () => {
      const startTime = Date.now();

      // Mock user not found
      APITestUtils.mockDatabaseQuery({
        rows: [],
        rowCount: 0
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      await POST(request);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have artificial delay to prevent timing attacks
      // This might need adjustment based on actual implementation
      expect(duration).toBeGreaterThan(500); // At least 500ms delay
    });
  });
});
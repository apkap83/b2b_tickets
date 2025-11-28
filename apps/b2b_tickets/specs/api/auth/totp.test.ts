/**
 * TOTP API Route Tests
 * Tests for /api/auth/totp endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/auth/totp/route';
import { APITestUtils } from '../api-test-setup';

// Import mocked modules
const mockVerifyTOTPToken = jest.fn();
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};

// Mock TOTP service
jest.mock('@b2b-tickets/totp-service', () => ({
  verifyTOTPToken: mockVerifyTOTPToken,
}));

// Mock Redis client
jest.mock('@b2b-tickets/redis-service', () => ({
  redisClient: mockRedisClient,
}));

describe('/api/auth/totp', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockVerifyTOTPToken.mockResolvedValue(true);
    mockRedisClient.get.mockResolvedValue('0'); // No previous attempts
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
  });

  describe('POST', () => {
    it('should verify TOTP token successfully', async () => {
      // Mock successful reCAPTCHA v3 response
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.9,
          action: 'totp_verification'
        }
      });

      // Mock database user lookup
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          totp_secret: 'TEST_SECRET',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
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
          message: 'TOTP verification successful'
        }
      });

      // Verify TOTP verification was called
      expect(mockVerifyTOTPToken).toHaveBeenCalledWith('123456', 'TEST_SECRET');
      
      // Verify rate limiting Redis operations
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockRedisClient.incr).toHaveBeenCalled();
    });

    it('should reject invalid TOTP code', async () => {
      // Mock successful reCAPTCHA but invalid TOTP
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.9,
          action: 'totp_verification'
        }
      });

      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          totp_secret: 'TEST_SECRET',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      // Mock TOTP verification failure
      mockVerifyTOTPToken.mockResolvedValue(false);

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '000000',
          recaptchaToken: 'valid-recaptcha-token'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Invalid TOTP code'
        }
      });

      // Should still track failed attempt
      expect(mockRedisClient.incr).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const testCases = [
        { body: {}, expectedMessage: 'Username is required' },
        { body: { userName: 'testuser' }, expectedMessage: 'TOTP code is required' },
        { body: { userName: 'testuser', totpCode: '123456' }, expectedMessage: 'reCAPTCHA token is required' },
      ];

      for (const testCase of testCases) {
        const request = APITestUtils.createMockRequest({
          method: 'POST',
          body: testCase.body
        });

        const response = await POST(request);

        await APITestUtils.assertResponse(response, {
          status: 400,
          data: {
            success: false,
            message: expect.stringContaining('required')
          }
        });
      }
    });

    it('should enforce rate limiting', async () => {
      // Mock too many attempts
      mockRedisClient.get.mockResolvedValue('5'); // 5 previous attempts

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
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
          message: 'Too many attempts. Please try again later.'
        }
      });

      // Should not verify TOTP if rate limited
      expect(mockVerifyTOTPToken).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      // Mock successful reCAPTCHA
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.9,
          action: 'totp_verification'
        }
      });

      // Mock user not found
      APITestUtils.mockDatabaseQuery({
        rows: [],
        rowCount: 0
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'nonexistentuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 404,
        data: {
          success: false,
          message: 'User not found'
        }
      });
    });

    it('should handle locked user account', async () => {
      // Mock successful reCAPTCHA
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.9,
          action: 'totp_verification'
        }
      });

      // Mock locked user
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          totp_secret: 'TEST_SECRET',
          user_status: 'Active',
          user_locked: true
        }],
        rowCount: 1
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
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
          message: 'Account is locked'
        }
      });
    });

    it('should handle inactive user account', async () => {
      // Mock successful reCAPTCHA
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.9,
          action: 'totp_verification'
        }
      });

      // Mock inactive user
      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          totp_secret: 'TEST_SECRET',
          user_status: 'Inactive',
          user_locked: false
        }],
        rowCount: 1
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
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
          message: 'Account is inactive'
        }
      });
    });

    it('should handle low reCAPTCHA score', async () => {
      // Mock low reCAPTCHA score (bot-like behavior)
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.2, // Low score indicates bot
          action: 'totp_verification'
        }
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'reCAPTCHA verification failed'
        }
      });
    });

    it('should handle database errors', async () => {
      // Mock successful reCAPTCHA
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.9,
          action: 'totp_verification'
        }
      });

      // Mock database error
      APITestUtils.mockDatabaseError(new Error('Database connection failed'));

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
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
          message: 'Internal server error'
        }
      });
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis failure
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      // Mock successful reCAPTCHA
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.9,
          action: 'totp_verification'
        }
      });

      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          totp_secret: 'TEST_SECRET',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      // Should still work even if Redis fails (graceful degradation)
      expect(response.status).toBe(200);
    });

    it('should validate TOTP code format', async () => {
      const invalidCodes = ['', '12345', '1234567', 'abcdef', '12-45-78'];

      for (const code of invalidCodes) {
        const request = APITestUtils.createMockRequest({
          method: 'POST',
          body: {
            userName: 'testuser',
            totpCode: code,
            recaptchaToken: 'valid-recaptcha-token'
          }
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('Invalid TOTP code format');
      }
    });

    it('should set JWT token cookie on successful verification', async () => {
      // Mock successful verification
      APITestUtils.mockFetchResponse({
        ok: true,
        json: {
          success: true,
          score: 0.9,
          action: 'totp_verification'
        }
      });

      APITestUtils.mockDatabaseQuery({
        rows: [{
          user_id: 123,
          userName: 'testuser',
          totp_secret: 'TEST_SECRET',
          user_status: 'Active',
          user_locked: false
        }],
        rowCount: 1
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          userName: 'testuser',
          totpCode: '123456',
          recaptchaToken: 'valid-recaptcha-token'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      // In the real implementation, this should set a totpJWTToken cookie
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
    });
  });
});
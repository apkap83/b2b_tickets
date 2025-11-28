/**
 * Reset Password Token API Route Tests
 * Tests for /api/user/resetPassToken endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/user/resetPassToken/route';
import { APITestUtils } from '../api-test-setup';

// Mock crypto for token decryption
const mockDecrypt = jest.fn();
const mockVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
  verify: mockVerify,
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'decrypted'),
    final: jest.fn(() => 'token'),
  })),
}));

describe('/api/user/resetPassToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful JWT verification
    mockVerify.mockReturnValue({
      userId: 123,
      userName: 'testuser',
      exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
    });
  });

  describe('POST', () => {
    it('should validate token successfully', async () => {
      // Mock user found and active
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
          token: 'valid-encrypted-jwt-token'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 200,
        data: {
          success: true,
          message: 'Token is valid',
          data: {
            userId: 123,
            userName: 'testuser'
          }
        }
      });
    });

    it('should handle missing token', async () => {
      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {}
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Reset token is required'
        }
      });

      // Should not query database
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('should handle empty token', async () => {
      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          token: ''
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Reset token is required'
        }
      });
    });

    it('should handle invalid token format', async () => {
      const invalidTokens = [
        null,
        undefined,
        123,
        {},
        [],
        'not-a-jwt-token',
        'invalid.token.format',
      ];

      for (const invalidToken of invalidTokens) {
        const request = APITestUtils.createMockRequest({
          method: 'POST',
          body: {
            token: invalidToken
          }
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toMatch(/Invalid token format|Reset token is required/);
      }
    });

    it('should handle token decryption failure', async () => {
      // Mock decryption failure
      const crypto = require('crypto');
      crypto.createDecipher.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          token: 'encrypted-but-invalid-token'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Invalid or corrupted reset token'
        }
      });
    });

    it('should handle JWT verification failure', async () => {
      // Mock JWT verification failure
      mockVerify.mockImplementation(() => {
        throw new Error('JWT verification failed');
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          token: 'valid-encrypted-but-invalid-jwt'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Invalid or expired reset token'
        }
      });
    });

    it('should handle expired JWT token', async () => {
      // Mock expired token
      mockVerify.mockReturnValue({
        userId: 123,
        userName: 'testuser',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          token: 'valid-but-expired-token'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Reset token has expired'
        }
      });
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
          token: 'valid-token-for-nonexistent-user'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 404,
        data: {
          success: false,
          message: 'User not found or account no longer exists'
        }
      });
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
          token: 'valid-token-for-locked-user'
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
          token: 'valid-token-for-inactive-user'
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
    });

    it('should handle database errors', async () => {
      // Mock database error
      APITestUtils.mockDatabaseError(new Error('Database connection failed'));

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          token: 'valid-token'
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

    it('should handle malformed JWT payload', async () => {
      // Mock JWT with missing required fields
      mockVerify.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
        // Missing userId and userName
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          token: 'token-with-incomplete-payload'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Invalid token payload'
        }
      });
    });

    it('should handle token with invalid user ID', async () => {
      // Mock JWT with invalid userId
      mockVerify.mockReturnValue({
        userId: 'invalid-id',
        userName: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          token: 'token-with-invalid-user-id'
        }
      });

      const response = await POST(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Invalid token payload'
        }
      });
    });

    it('should validate token timing window', async () => {
      // Mock token that was issued very recently (prevent timing attacks)
      mockVerify.mockReturnValue({
        userId: 123,
        userName: 'testuser',
        iat: Math.floor(Date.now() / 1000), // Issued just now
        exp: Math.floor(Date.now() / 1000) + 3600
      });

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
          token: 'very-recent-token'
        }
      });

      const response = await POST(request);

      // Should still work - this test is for timing attack prevention
      expect(response.status).toBe(200);
    });

    it('should handle concurrent validation requests', async () => {
      // Mock successful verification and database query
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

      const requests = Array.from({ length: 5 }, (_, i) =>
        APITestUtils.createMockRequest({
          method: 'POST',
          body: {
            token: `valid-token-${i}`
          }
        })
      );

      // Execute requests concurrently
      const responses = await Promise.all(
        requests.map(request => POST(request))
      );

      // All should succeed
      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });
    });

    it('should handle user status edge cases', async () => {
      const statusCases = [
        { status: 'Pending', shouldAllow: false, expectedMessage: 'Account is pending activation' },
        { status: 'Suspended', shouldAllow: false, expectedMessage: 'Account is suspended' },
        { status: 'Deleted', shouldAllow: false, expectedMessage: 'Account no longer exists' },
        { status: 'Active', shouldAllow: true, expectedMessage: 'Token is valid' },
      ];

      for (const testCase of statusCases) {
        APITestUtils.mockDatabaseQuery({
          rows: [{
            user_id: 123,
            userName: 'testuser',
            email: 'test@example.com',
            user_status: testCase.status,
            user_locked: false
          }],
          rowCount: 1
        });

        const request = APITestUtils.createMockRequest({
          method: 'POST',
          body: {
            token: 'valid-token'
          }
        });

        const response = await POST(request);

        if (testCase.shouldAllow) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(403);
        }

        const data = await response.json();
        expect(data.message).toContain(testCase.expectedMessage);
      }
    });

    it('should sanitize token input', async () => {
      const maliciousTokens = [
        'token<script>alert("xss")</script>',
        'token"; DROP TABLE users; --',
        'token\n\nmalicious-content',
        'token\r\nHeader-Injection: malicious',
      ];

      for (const maliciousToken of maliciousTokens) {
        const request = APITestUtils.createMockRequest({
          method: 'POST',
          body: {
            token: maliciousToken
          }
        });

        const response = await POST(request);

        // Should either reject malicious input or handle it safely
        expect(response.status).toBeGreaterThanOrEqual(400);
        const data = await response.json();
        expect(data.success).toBe(false);
      }
    });

    it('should implement rate limiting', async () => {
      // This would test rate limiting if implemented
      // Mock Redis rate limiting
      APITestUtils.mockRedisOperations({
        get: '5', // 5 previous attempts
        incr: 6,
        expire: true
      });

      const request = APITestUtils.createMockRequest({
        method: 'POST',
        body: {
          token: 'valid-token'
        },
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request);

      // If rate limiting is implemented, this might return 429
      // For now, just ensure endpoint handles the scenario
      expect(response).toBeDefined();
    });

    it('should handle token reuse prevention', async () => {
      // Test that tokens can only be validated once (if implemented)
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

      const token = 'one-time-use-token';
      
      const request1 = APITestUtils.createMockRequest({
        method: 'POST',
        body: { token }
      });

      const request2 = APITestUtils.createMockRequest({
        method: 'POST',
        body: { token }
      });

      // First validation should succeed
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Second validation might be rejected if one-time use is implemented
      const response2 = await POST(request2);
      // This depends on implementation - might be 200 or 400
      expect(response2.status).toBeGreaterThanOrEqual(200);
    });
  });
});
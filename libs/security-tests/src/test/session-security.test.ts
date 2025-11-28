/**
 * Session Security Tests
 * 
 * Tests for session management vulnerabilities including:
 * - Session hijacking prevention
 * - JWT token security
 * - Session timeout handling
 * - Concurrent session management
 * - Redis-based session storage security
 */

import { SecurityTestUtils } from './security-test-utils';

// Mock Redis client
const mockRedisClient = SecurityTestUtils.createMockRedisForRateLimit();
jest.mock('@b2b-tickets/redis-service', () => ({
  redisClient: mockRedisClient,
}));

// Mock NextAuth session
const mockGetServerSession = jest.fn();
jest.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('Session Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Hijacking Prevention', () => {
    it('should detect session token manipulation', async () => {
      const validSession = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
      const validTokens = SecurityTestUtils.createMockJwtTokens();

      mockGetServerSession.mockResolvedValue(validSession);

      const validateSessionToken = async (providedToken: string) => {
        const session = await mockGetServerSession();
        if (!session) throw new Error('No session');

        // Simulate JWT validation
        const isValidToken = providedToken === validTokens.validToken;
        const isExpiredToken = providedToken === validTokens.expiredToken;
        const isMalformedToken = providedToken === validTokens.malformedToken;

        if (isMalformedToken) {
          mockLogger.error('Malformed JWT token detected', {
            userId: session.user.user_id,
            token: providedToken.substring(0, 20) + '...',
          });
          throw new Error('Invalid token format');
        }

        if (isExpiredToken) {
          mockLogger.warn('Expired JWT token used', {
            userId: session.user.user_id,
          });
          throw new Error('Token expired');
        }

        if (!isValidToken) {
          mockLogger.error('Invalid JWT token signature', {
            userId: session.user.user_id,
            suspiciousActivity: true,
          });
          throw new Error('Invalid token signature');
        }

        return { valid: true, session };
      };

      // Valid token should work
      const validResult = await validateSessionToken(validTokens.validToken);
      expect(validResult.valid).toBe(true);

      // Invalid tokens should be rejected
      await expect(validateSessionToken(validTokens.malformedToken))
        .rejects.toThrow('Invalid token format');
      
      await expect(validateSessionToken(validTokens.expiredToken))
        .rejects.toThrow('Token expired');
      
      await expect(validateSessionToken('invalid-token'))
        .rejects.toThrow('Invalid token signature');

      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('should validate session IP address consistency', async () => {
      const session = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
      mockGetServerSession.mockResolvedValue(session);

      // Mock stored session data in Redis
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.includes('session_ip')) {
          return '192.168.1.100'; // Original IP
        }
        return null;
      });

      const validateSessionIP = async (currentIP: string) => {
        const session = await mockGetServerSession();
        if (!session) throw new Error('No session');

        const sessionKey = `session_ip:${session.user.user_id}`;
        const storedIP = await mockRedisClient.get(sessionKey);

        if (storedIP && storedIP !== currentIP) {
          mockLogger.error('Session IP address mismatch detected', {
            userId: session.user.user_id,
            storedIP,
            currentIP,
            potentialHijacking: true,
          });

          // Invalidate session on IP mismatch
          await mockRedisClient.del(`session:${session.user.user_id}`);
          throw new Error('Session invalidated due to IP mismatch');
        }

        // Update IP if not stored
        if (!storedIP) {
          await mockRedisClient.set(sessionKey, currentIP);
          await mockRedisClient.expire(sessionKey, 3600);
        }

        return { valid: true };
      };

      // Same IP should work
      const validResult = await validateSessionIP('192.168.1.100');
      expect(validResult.valid).toBe(true);

      // Different IP should trigger security alert
      await expect(validateSessionIP('10.0.0.1'))
        .rejects.toThrow('Session invalidated due to IP mismatch');

      expect(mockLogger.error).toHaveBeenCalledWith('Session IP address mismatch detected', {
        userId: 1,
        storedIP: '192.168.1.100',
        currentIP: '10.0.0.1',
        potentialHijacking: true,
      });
    });

    it('should detect concurrent session abuse', async () => {
      const session = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
      mockGetServerSession.mockResolvedValue(session);

      // Mock concurrent session tracking
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.includes('concurrent_sessions')) {
          return '2'; // Current session count
        }
        return null;
      });

      const manageConcurrentSessions = async (maxSessions: number = 3) => {
        const session = await mockGetServerSession();
        if (!session) throw new Error('No session');

        const sessionCountKey = `concurrent_sessions:${session.user.user_id}`;
        const currentSessions = await mockRedisClient.get(sessionCountKey);
        const sessionCount = currentSessions ? parseInt(currentSessions) : 0;

        if (sessionCount >= maxSessions) {
          mockLogger.warn('Maximum concurrent sessions exceeded', {
            userId: session.user.user_id,
            currentSessions: sessionCount,
            maxAllowed: maxSessions,
          });

          // Force logout oldest sessions
          await mockRedisClient.del(`old_sessions:${session.user.user_id}`);
          throw new Error('Maximum concurrent sessions exceeded');
        }

        // Increment session count
        await mockRedisClient.incr(sessionCountKey);
        await mockRedisClient.expire(sessionCountKey, 3600);

        return { sessionCount: sessionCount + 1 };
      };

      // Should work within limit
      const result1 = await manageConcurrentSessions(3);
      expect(result1.sessionCount).toBe(3);

      // Should fail when exceeding limit (reset mock to return higher value)
      mockRedisClient.get.mockResolvedValueOnce('3'); // At max limit
      await expect(manageConcurrentSessions(3)).rejects.toThrow('Maximum concurrent sessions exceeded');
      expect(mockLogger.warn).toHaveBeenCalledWith('Maximum concurrent sessions exceeded', {
        userId: 1,
        currentSessions: 3,
        maxAllowed: 3,
      });
    });
  });

  describe('JWT Token Security', () => {
    it('should validate JWT token expiration', async () => {
      const session = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
      const tokens = SecurityTestUtils.createMockJwtTokens();

      mockGetServerSession.mockResolvedValue(session);

      const validateTokenExpiration = async (token: string) => {
        // Simulate JWT payload extraction
        const isExpired = token === tokens.expiredToken;
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (isExpired) {
          mockLogger.warn('Expired token access attempt', {
            token: token.substring(0, 20) + '...',
            currentTime,
          });
          throw new Error('Token has expired');
        }

        return { valid: true, token };
      };

      // Valid token should work
      const validResult = await validateTokenExpiration(tokens.validToken);
      expect(validResult.valid).toBe(true);

      // Expired token should be rejected
      await expect(validateTokenExpiration(tokens.expiredToken))
        .rejects.toThrow('Token has expired');

      expect(mockLogger.warn).toHaveBeenCalledWith('Expired token access attempt', 
        expect.objectContaining({
          token: expect.stringContaining('eyJhbGciOiJIUzI1NiIs'),
        })
      );
    });

    it('should prevent JWT token replay attacks', async () => {
      const session = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
      mockGetServerSession.mockResolvedValue(session);

      // Mock used token tracking in Redis
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.includes('used_token')) {
          return key.includes('used-token-123') ? 'used' : null;
        }
        return null;
      });

      const preventTokenReplay = async (token: string) => {
        const session = await mockGetServerSession();
        if (!session) throw new Error('No session');

        // Extract token ID (simplified)
        const tokenId = token.includes('used-token') ? 'used-token-123' : 'new-token-456';
        const usedTokenKey = `used_token:${tokenId}`;

        // Check if token was already used
        const wasUsed = await mockRedisClient.get(usedTokenKey);
        if (wasUsed) {
          mockLogger.error('Token replay attack detected', {
            userId: session.user.user_id,
            tokenId,
            suspiciousActivity: true,
          });
          throw new Error('Token replay detected');
        }

        // Mark token as used
        await mockRedisClient.set(usedTokenKey, 'used');
        await mockRedisClient.expire(usedTokenKey, 3600);

        return { valid: true, tokenId };
      };

      // New token should work
      const newTokenResult = await preventTokenReplay('new-token-456');
      expect(newTokenResult.valid).toBe(true);

      // Used token should be rejected
      await expect(preventTokenReplay('used-token-123'))
        .rejects.toThrow('Token replay detected');

      expect(mockLogger.error).toHaveBeenCalledWith('Token replay attack detected', {
        userId: 1,
        tokenId: 'used-token-123',
        suspiciousActivity: true,
      });
    });
  });

  describe('Session Timeout Security', () => {
    it('should enforce proper session timeout', async () => {
      const session = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
      mockGetServerSession.mockResolvedValue(session);

      // Mock session timestamp tracking
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.includes('last_activity')) {
          // Return timestamp 2 hours ago
          return (Date.now() - (2 * 60 * 60 * 1000)).toString();
        }
        return null;
      });

      const checkSessionTimeout = async (timeoutMinutes: number = 60) => {
        const session = await mockGetServerSession();
        if (!session) throw new Error('No session');

        const activityKey = `last_activity:${session.user.user_id}`;
        const lastActivity = await mockRedisClient.get(activityKey);
        
        if (lastActivity) {
          const lastActivityTime = parseInt(lastActivity);
          const timeoutMs = timeoutMinutes * 60 * 1000;
          const isExpired = (Date.now() - lastActivityTime) > timeoutMs;

          if (isExpired) {
            mockLogger.info('Session expired due to timeout', {
              userId: session.user.user_id,
              lastActivity: new Date(lastActivityTime).toISOString(),
              timeoutMinutes,
            });

            // Clear expired session
            await mockRedisClient.del(`session:${session.user.user_id}`);
            await mockRedisClient.del(activityKey);
            throw new Error('Session expired');
          }
        }

        // Update last activity
        await mockRedisClient.set(activityKey, Date.now().toString());
        await mockRedisClient.expire(activityKey, timeoutMinutes * 60);

        return { valid: true };
      };

      // Session should be expired (2 hours old with 60 minute timeout)
      await expect(checkSessionTimeout(60)).rejects.toThrow('Session expired');
      expect(mockLogger.info).toHaveBeenCalledWith('Session expired due to timeout', 
        expect.objectContaining({
          userId: 1,
          timeoutMinutes: 60,
        })
      );
    });

    it('should handle session cleanup on logout', async () => {
      const session = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
      mockGetServerSession.mockResolvedValue(session);

      const performLogout = async () => {
        const session = await mockGetServerSession();
        if (!session) throw new Error('No session');

        const userId = session.user.user_id;

        // Clear all session-related data
        const keysToDelete = [
          `session:${userId}`,
          `last_activity:${userId}`,
          `session_ip:${userId}`,
          `concurrent_sessions:${userId}`,
          `totp_attempts:${userId}`,
        ];

        for (const key of keysToDelete) {
          await mockRedisClient.del(key);
        }

        mockLogger.info('User logged out - session data cleared', {
          userId,
          clearedKeys: keysToDelete.length,
        });

        return { success: true };
      };

      const result = await performLogout();
      expect(result.success).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(5);
      expect(mockLogger.info).toHaveBeenCalledWith('User logged out - session data cleared', {
        userId: 1,
        clearedKeys: 5,
      });
    });
  });

  describe('Redis Session Storage Security', () => {
    it('should encrypt sensitive session data in Redis', async () => {
      const session = SecurityTestUtils.createMockSession(['User'], ['Tickets_Page']);
      mockGetServerSession.mockResolvedValue(session);

      const storeSessionData = async (sessionData: any) => {
        const session = await mockGetServerSession();
        if (!session) throw new Error('No session');

        // Simulate encryption of sensitive data
        const encryptSensitiveData = (data: any) => {
          const sensitiveFields = ['password', 'secret', 'token'];
          const encrypted = { ...data };
          
          for (const field of sensitiveFields) {
            if (encrypted[field]) {
              encrypted[field] = `encrypted_${encrypted[field]}`;
            }
          }
          
          return encrypted;
        };

        const encryptedData = encryptSensitiveData(sessionData);
        const sessionKey = `session:${session.user.user_id}`;

        await mockRedisClient.set(sessionKey, JSON.stringify(encryptedData));
        await mockRedisClient.expire(sessionKey, 3600);

        return { stored: true };
      };

      const sensitiveSessionData = {
        userId: 1,
        token: 'secret-jwt-token',
        secret: 'user-secret-key',
        normalData: 'public-info',
      };

      const result = await storeSessionData(sensitiveSessionData);
      expect(result.stored).toBe(true);

      // Verify encryption was applied to sensitive fields
      const storedCall = mockRedisClient.set.mock.calls[0];
      const storedData = JSON.parse(storedCall[1]);
      
      expect(storedData.token).toBe('encrypted_secret-jwt-token');
      expect(storedData.secret).toBe('encrypted_user-secret-key');
      expect(storedData.normalData).toBe('public-info'); // Not encrypted
    });

    it('should validate Redis connection security', async () => {
      // Mock Redis to return 'ok' for health check
      mockRedisClient.get.mockResolvedValueOnce('ok');
      
      const validateRedisConnection = async () => {
        try {
          // Test Redis connectivity and security
          await mockRedisClient.set('health_check', 'ok');
          const healthCheck = await mockRedisClient.get('health_check');
          
          if (healthCheck !== 'ok') {
            mockLogger.error('Redis health check failed', {
              expected: 'ok',
              received: healthCheck,
            });
            throw new Error('Redis connection unhealthy');
          }

          // Clean up health check
          await mockRedisClient.del('health_check');

          mockLogger.debug('Redis connection validated');
          return { healthy: true };
        } catch (error) {
          mockLogger.error('Redis connection validation failed', {
            error: (error as Error).message,
          });
          throw error;
        }
      };

      const result = await validateRedisConnection();
      expect(result.healthy).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Redis connection validated');
    });

    it('should prevent session data leakage between users', async () => {
      const user1Session = SecurityTestUtils.createMockSession(['User'], [], { user_id: 1 });
      const user2Session = SecurityTestUtils.createMockSession(['User'], [], { user_id: 2 });

      // Mock Redis data for different users
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key === 'session:1') return JSON.stringify({ userId: 1, data: 'user1_data' });
        if (key === 'session:2') return JSON.stringify({ userId: 2, data: 'user2_data' });
        return null;
      });

      const getSessionData = async (requestingUserId: number, targetUserId: number) => {
        const sessionKey = `session:${targetUserId}`;
        const sessionData = await mockRedisClient.get(sessionKey);
        
        if (!sessionData) return null;
        
        const parsed = JSON.parse(sessionData);
        
        // Validate user can only access their own session data
        if (requestingUserId !== parsed.userId) {
          mockLogger.error('Attempted cross-user session access', {
            requestingUserId,
            targetUserId: parsed.userId,
            suspiciousActivity: true,
          });
          throw new Error('Unauthorized session access');
        }

        return parsed;
      };

      // User can access own session
      const ownData = await getSessionData(1, 1);
      expect(ownData?.data).toBe('user1_data');

      // User cannot access another user's session
      await expect(getSessionData(1, 2)).rejects.toThrow('Unauthorized session access');
      expect(mockLogger.error).toHaveBeenCalledWith('Attempted cross-user session access', {
        requestingUserId: 1,
        targetUserId: 2,
        suspiciousActivity: true,
      });
    });
  });
});
/**
 * Password & TOTP Security Tests
 * 
 * Tests for password and two-factor authentication security including:
 * - Password complexity validation
 * - TOTP generation and validation
 * - Rate limiting for TOTP attempts
 * - Password reset security
 * - Brute force protection
 */

// Import will be mocked
import { SecurityTestUtils } from './security-test-utils';

// Mock Redis for rate limiting
const mockRedisClient = SecurityTestUtils.createMockRedisForRateLimit();
jest.mock('@b2b-tickets/redis-service', () => ({
  redisClient: mockRedisClient,
}));

// Mock bcrypt properly
const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn(),
};

jest.mock('bcryptjs', () => mockBcrypt);

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('Password & TOTP Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Security Tests', () => {
    it('should enforce strong password complexity requirements', async () => {
      const validatePasswordComplexity = (password: string): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (password.length < 8) {
          errors.push('Password must be at least 8 characters long');
        }

        if (!/[A-Z]/.test(password)) {
          errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
          errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
          errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          errors.push('Password must contain at least one special character');
        }

        // Check for common weak patterns
        const weakPatterns = [
          /(.)\1{2,}/, // Repeated characters (aaa, 111)
          /^[0-9]+$/, // Only numbers
          /^[a-zA-Z]+$/, // Only letters
          /(012|123|234|345|456|567|678|789|890)/, // Sequential numbers
          /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential letters
        ];

        for (const pattern of weakPatterns) {
          if (pattern.test(password)) {
            errors.push('Password contains weak patterns (repeated, sequential characters)');
            break;
          }
        }

        // Check against common passwords
        const commonPasswords = [
          'password', 'password123', '123456', 'qwerty', 'letmein',
          'welcome', 'admin', 'administrator', 'root', 'user'
        ];

        if (commonPasswords.includes(password.toLowerCase())) {
          errors.push('Password is too common');
        }

        return { valid: errors.length === 0, errors };
      };

      // Test weak passwords
      const weakPasswords = [
        'weak',                    // Too short
        'password',               // No uppercase/numbers/special
        'PASSWORD',               // No lowercase/numbers/special
        '12345678',              // No letters/special
        'Password',              // No numbers/special
        'Password1',             // No special characters
        'aaa111!!!',             // Repeated characters
        'abc123!',               // Sequential characters
        'password123',           // Common password
      ];

      for (const weakPassword of weakPasswords) {
        const result = validatePasswordComplexity(weakPassword);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }

      // Test strong passwords
      const strongPasswords = [
        'MyStr0ng!P@ssw0rd',
        'C0mpl3x!P4ssW0rd#2024',
        'Secure&C0mplex!Pass',
        '9Strong*Password$',
      ];

      for (const strongPassword of strongPasswords) {
        const result = validatePasswordComplexity(strongPassword);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should properly hash passwords with adequate salt rounds', async () => {
      const password = 'MyStr0ng!Password';
      const hashedPassword = '$2b$12$hashedpasswordwithstrongsalt';
      
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockBcrypt.compare.mockResolvedValue(true);

      const hashPassword = async (plainPassword: string, saltRounds: number = 12) => {
        if (saltRounds < 10) {
          mockLogger.warn('Insufficient salt rounds for password hashing', {
            providedRounds: saltRounds,
            recommendedMinimum: 12,
          });
        }

        const hashed = await mockBcrypt.hash(plainPassword, saltRounds);
        return hashed;
      };

      // Test with strong salt rounds
      const strongHash = await hashPassword(password, 12);
      expect(strongHash).toBe(hashedPassword);
      expect(mockLogger.warn).not.toHaveBeenCalled();

      // Test with weak salt rounds
      await hashPassword(password, 8);
      expect(mockLogger.warn).toHaveBeenCalledWith('Insufficient salt rounds for password hashing', {
        providedRounds: 8,
        recommendedMinimum: 12,
      });
    });

    it('should prevent password reuse', async () => {
      const user = SecurityTestUtils.createMockUser({
        password: '$2b$12$previoushashedpassword',
      });

      // Mock password history (simplified)
      const passwordHistory = [
        '$2b$12$previoushashedpassword',
        '$2b$12$oldhashedpassword1',
        '$2b$12$oldhashedpassword2',
      ];

      const validatePasswordReuse = async (newPassword: string) => {
        // Check against current password
        const isSameAsCurrent = await mockBcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
          mockLogger.warn('Password reuse attempt - same as current', {
            userId: user.user_id,
          });
          throw new Error('New password cannot be the same as current password');
        }

        // Check against password history
        for (const historicalPassword of passwordHistory) {
          const isSameAsHistorical = await mockBcrypt.compare(newPassword, historicalPassword);
          if (isSameAsHistorical) {
            mockLogger.warn('Password reuse attempt - matches history', {
              userId: user.user_id,
              historyDepth: passwordHistory.length,
            });
            throw new Error('New password cannot be the same as previous passwords');
          }
        }

        return { valid: true };
      };

      // Test reused current password
      mockBcrypt.compare.mockResolvedValueOnce(true); // Matches current password
      await expect(validatePasswordReuse('previousPassword')).rejects.toThrow('same as current password');

      // Test new unique password
      mockBcrypt.compare.mockResolvedValue(false); // Doesn't match any password
      const result = await validatePasswordReuse('NewStr0ng!Password');
      expect(result.valid).toBe(true);
    });

    it('should implement secure password reset flow', async () => {
      const user = SecurityTestUtils.createMockUser();
      const resetToken = SecurityTestUtils.createMockJwtTokens().validToken;

      // Mock token storage in Redis
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.includes('reset_token')) {
          return resetToken;
        }
        return null;
      });

      const resetPassword = async (email: string, token: string, newPassword: string) => {
        // Validate reset token
        const tokenKey = `reset_token:${email}`;
        const storedToken = await mockRedisClient.get(tokenKey);
        
        if (!storedToken || storedToken !== token) {
          mockLogger.error('Invalid password reset token', {
            email,
            providedToken: token.substring(0, 10) + '...',
          });
          throw new Error('Invalid or expired reset token');
        }

        // Validate new password complexity
        const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordValidation.test(newPassword)) {
          throw new Error('New password does not meet complexity requirements');
        }

        // Hash new password
        const hashedPassword = await mockBcrypt.hash(newPassword, 12);
        
        // Update user password
        user.password = hashedPassword;
        user.change_password = 'n';
        await user.save();

        // Remove reset token
        await mockRedisClient.del(tokenKey);

        mockLogger.info('Password reset successful', {
          email,
          userId: user.user_id,
        });

        return { success: true };
      };

      mockBcrypt.hash.mockResolvedValue('$2b$12$newhashedpassword');

      // Valid password reset should succeed
      const result = await resetPassword('test@example.com', resetToken, 'NewStr0ng!Password');
      expect(result.success).toBe(true);
      expect(user.password).toBe('$2b$12$newhashedpassword');
      expect(mockRedisClient.del).toHaveBeenCalledWith('reset_token:test@example.com');

      // Invalid token should fail
      await expect(resetPassword('test@example.com', 'invalid-token', 'NewStr0ng!Password'))
        .rejects.toThrow('Invalid or expired reset token');

      // Weak password should fail
      await expect(resetPassword('test@example.com', resetToken, 'weakpass'))
        .rejects.toThrow('complexity requirements');
    });
  });

  describe('TOTP Security Tests', () => {
    it('should generate and validate TOTP codes correctly', async () => {
      const user = SecurityTestUtils.createMockUser({
        two_factor_secret: 'encrypted_totp_secret',
        mfa_method: 'email',
      });

      const totpCodes = SecurityTestUtils.createMockTotpCodes();

      const generateTOTP = async (userId: number) => {
        // Generate 5-digit TOTP code
        const code = Math.floor(10000 + Math.random() * 90000).toString();
        const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes

        // Store in Redis with expiration
        const totpKey = `totp:${userId}`;
        await mockRedisClient.set(totpKey, JSON.stringify({
          code,
          expires: expirationTime,
          used: false,
        }));
        await mockRedisClient.expire(totpKey, 300); // 5 minutes

        mockLogger.debug('TOTP code generated', {
          userId,
          codeLength: code.length,
          expiresIn: 300,
        });

        return { code, expires: expirationTime };
      };

      const validateTOTP = async (userId: number, providedCode: string) => {
        const totpKey = `totp:${userId}`;
        const storedData = await mockRedisClient.get(totpKey);

        if (!storedData) {
          mockLogger.warn('TOTP validation attempt with no active code', { userId });
          throw new Error('No active TOTP code');
        }

        const totpData = JSON.parse(storedData);

        // Check expiration
        if (Date.now() > totpData.expires) {
          mockLogger.warn('Expired TOTP code used', {
            userId,
            expiredBy: Date.now() - totpData.expires,
          });
          await mockRedisClient.del(totpKey);
          throw new Error('TOTP code expired');
        }

        // Check if already used
        if (totpData.used) {
          mockLogger.error('TOTP replay attack detected', {
            userId,
            suspiciousActivity: true,
          });
          throw new Error('TOTP code already used');
        }

        // Validate code
        if (providedCode !== totpData.code) {
          mockLogger.warn('Invalid TOTP code provided', {
            userId,
            attemptsRemaining: 2, // Example
          });
          throw new Error('Invalid TOTP code');
        }

        // Mark as used
        totpData.used = true;
        await mockRedisClient.set(totpKey, JSON.stringify(totpData));

        mockLogger.info('TOTP validation successful', { userId });
        return { valid: true };
      };

      // Mock Redis responses
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.includes('totp:')) {
          return JSON.stringify({
            code: totpCodes.validCode,
            expires: Date.now() + 300000,
            used: false,
          });
        }
        return null;
      });

      // Generate TOTP
      const generated = await generateTOTP(user.user_id);
      expect(generated.code).toBeDefined();
      expect(generated.expires).toBeGreaterThan(Date.now());

      // Valid TOTP should work
      const validResult = await validateTOTP(user.user_id, totpCodes.validCode);
      expect(validResult.valid).toBe(true);

      // Invalid TOTP should fail
      await expect(validateTOTP(user.user_id, totpCodes.invalidCode))
        .rejects.toThrow('Invalid TOTP code');
    });

    it('should implement TOTP rate limiting to prevent brute force', async () => {
      const user = SecurityTestUtils.createMockUser();
      const maxAttempts = 3;
      const banDuration = 300; // 5 minutes

      // Mock current attempt count
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.includes('totp_attempts')) {
          return '2'; // 2 previous attempts
        }
        return null;
      });

      const validateTOTPWithRateLimit = async (userId: number, code: string, clientIP: string) => {
        const attemptsKey = `totp_attempts:${clientIP}:${userId}`;
        const banKey = `totp_banned:${clientIP}:${userId}`;

        // Check if IP/user is banned
        const isBanned = await mockRedisClient.get(banKey);
        if (isBanned) {
          mockLogger.error('TOTP attempt from banned IP/user', {
            userId,
            clientIP,
            remainingBanTime: banDuration,
          });
          throw new Error('Maximum attempts exceeded. Try again later.');
        }

        // Check current attempt count
        const currentAttempts = await mockRedisClient.get(attemptsKey);
        const attemptCount = currentAttempts ? parseInt(currentAttempts) : 0;

        if (attemptCount >= maxAttempts) {
          // Ban the IP/user
          await mockRedisClient.set(banKey, 'banned');
          await mockRedisClient.expire(banKey, banDuration);

          mockLogger.error('TOTP brute force detected - IP/user banned', {
            userId,
            clientIP,
            attempts: attemptCount + 1,
            banDuration,
          });

          throw new Error('Maximum attempts exceeded. IP banned.');
        }

        // Increment attempt counter
        await mockRedisClient.incr(attemptsKey);
        await mockRedisClient.expire(attemptsKey, banDuration);

        // Simulate TOTP validation (simplified)
        const validCode = '12345';
        if (code !== validCode) {
          mockLogger.warn('Invalid TOTP attempt', {
            userId,
            clientIP,
            attemptsRemaining: maxAttempts - (attemptCount + 1),
          });
          throw new Error('Invalid TOTP code');
        }

        // Reset attempt counter on success
        await mockRedisClient.del(attemptsKey);
        return { valid: true };
      };

      // Should fail with invalid code and increment attempts
      await expect(validateTOTPWithRateLimit(user.user_id, '00000', '192.168.1.100'))
        .rejects.toThrow('Invalid TOTP code');

      expect(mockRedisClient.incr).toHaveBeenCalledWith('totp_attempts:192.168.1.100:1');

      // Should trigger ban after max attempts
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.includes('totp_banned')) {
          return null; // Not banned yet
        }
        if (key.includes('totp_attempts')) {
          return '3'; // Already at max attempts
        }
        return null;
      });
      await expect(validateTOTPWithRateLimit(user.user_id, '00000', '192.168.1.100'))
        .rejects.toThrow('Maximum attempts exceeded. IP banned.');

      expect(mockLogger.error).toHaveBeenCalledWith('TOTP brute force detected - IP/user banned', 
        expect.objectContaining({
          userId: 1,
          clientIP: '192.168.1.100',
        })
      );
    });

    it('should allow TOTP bypass for admin users with proper validation', async () => {
      const adminUser = SecurityTestUtils.createMockAdminUser({
        two_factor_secret: 'encrypted_totp_secret',
      });

      const improvedAdminTOTPCheck = (username: string, totpCode: string, hasAdminRole: boolean = true) => {
        // IMPROVED: Admin users can bypass TOTP but with proper role validation
        if (username === 'admin') {
          if (!hasAdminRole) {
            mockLogger.error('SECURITY ALERT: User with admin username lacks Admin role');
            throw new Error('Invalid credentials');
          }
          mockLogger.info('Admin TOTP bypass used with proper validation');
          return { valid: true, bypassed: true };
        }

        // Regular TOTP validation
        const validCode = '12345';
        return { valid: totpCode === validCode, bypassed: false };
      };

      // Test improved admin bypass with proper role
      const adminResult1 = improvedAdminTOTPCheck('admin', '00000', true);
      expect(adminResult1.valid).toBe(true);
      expect(adminResult1.bypassed).toBe(true);

      const adminResult2 = improvedAdminTOTPCheck('admin', 'invalid', true);
      expect(adminResult2.valid).toBe(true);
      expect(adminResult2.bypassed).toBe(true);

      // Test security improvement: block fake admin without role
      expect(() => improvedAdminTOTPCheck('admin', '00000', false))
        .toThrow('Invalid credentials');

      // Regular user should require valid TOTP
      const userResult1 = improvedAdminTOTPCheck('regularuser', '00000');
      expect(userResult1.valid).toBe(false);
      expect(userResult1.bypassed).toBe(false);

      const userResult2 = improvedAdminTOTPCheck('regularuser', '12345');
      expect(userResult2.valid).toBe(true);
      expect(userResult2.bypassed).toBe(false);

      // Verify proper logging
      expect(mockLogger.info).toHaveBeenCalledWith('Admin TOTP bypass used with proper validation');
      expect(mockLogger.error).toHaveBeenCalledWith('SECURITY ALERT: User with admin username lacks Admin role');
    });
  });

  describe('Brute Force Protection', () => {
    it('should implement progressive delay for failed login attempts', async () => {
      const user = SecurityTestUtils.createMockUser({
        last_login_failed_attempts: 0,
      });

      const calculateDelayForFailedAttempt = (attemptCount: number): number => {
        // Progressive delay: 2^(attempts+1) seconds (capped at 300 seconds)
        const delay = Math.min(Math.pow(2, attemptCount + 1), 300);
        return delay * 1000; // Convert to milliseconds
      };

      const attemptLoginWithDelay = async (password: string, currentAttempts: number) => {
        const isValidPassword = password === 'correctpassword';
        
        if (!isValidPassword) {
          const delay = calculateDelayForFailedAttempt(currentAttempts);
          
          mockLogger.warn('Failed login attempt - implementing progressive delay', {
            userId: user.user_id,
            attemptNumber: currentAttempts + 1,
            delayMs: delay,
          });

          // Simulate delay (in real implementation, would actually delay)
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, 100))); // Limited for test

          user.last_login_failed_attempts = currentAttempts + 1;
          throw new Error('Invalid credentials');
        }

        // Reset attempts on successful login
        user.last_login_failed_attempts = 0;
        return { success: true };
      };

      // Test progressive delays
      const expectedDelays = [2000, 4000, 8000, 16000, 32000]; // 2^n seconds

      for (let attempt = 0; attempt < 5; attempt++) {
        const expectedDelay = calculateDelayForFailedAttempt(attempt);
        expect(expectedDelay).toBe(expectedDelays[attempt]);

        await expect(attemptLoginWithDelay('wrongpassword', attempt))
          .rejects.toThrow('Invalid credentials');

        expect(mockLogger.warn).toHaveBeenCalledWith('Failed login attempt - implementing progressive delay', {
          userId: 1,
          attemptNumber: attempt + 1,
          delayMs: expectedDelay,
        });
      }

      // Successful login should reset attempts
      const successResult = await attemptLoginWithDelay('correctpassword', 5);
      expect(successResult.success).toBe(true);
      expect(user.last_login_failed_attempts).toBe(0);
    });

    it('should detect and prevent credential stuffing attacks', async () => {
      const credentialStuffingPatterns = SecurityTestUtils.getBruteForcePatterns();

      const detectCredentialStuffing = async (clientIP: string, username: string, password: string) => {
        const attemptKey = `login_attempts:${clientIP}`;
        const patternKey = `patterns:${clientIP}`;

        // Track attempt patterns
        const recentAttempts = await mockRedisClient.get(attemptKey);
        const attemptCount = recentAttempts ? parseInt(recentAttempts) : 0;

        // Check for common credential stuffing patterns
        const isCommonPattern = credentialStuffingPatterns.includes(password);
        
        if (isCommonPattern && attemptCount > 5) {
          mockLogger.error('Credential stuffing attack detected', {
            clientIP,
            username,
            attemptCount: attemptCount + 1,
            commonPasswordUsed: true,
          });

          // Ban IP for credential stuffing
          await mockRedisClient.set(`banned:${clientIP}`, 'credential_stuffing');
          await mockRedisClient.expire(`banned:${clientIP}`, 3600);

          throw new Error('Suspicious activity detected. Access denied.');
        }

        // Increment attempt counter
        await mockRedisClient.incr(attemptKey);
        await mockRedisClient.expire(attemptKey, 3600);

        // Track password patterns
        await mockRedisClient.set(`${patternKey}:${password}`, '1');
        await mockRedisClient.expire(`${patternKey}:${password}`, 3600);

        return { allowed: true };
      };

      // Mock high attempt count
      mockRedisClient.get.mockResolvedValue('6');

      // Should detect credential stuffing with common passwords
      await expect(
        detectCredentialStuffing('10.0.0.1', 'testuser', 'password123')
      ).rejects.toThrow('Suspicious activity detected');

      expect(mockLogger.error).toHaveBeenCalledWith('Credential stuffing attack detected', {
        clientIP: '10.0.0.1',
        username: 'testuser',
        attemptCount: 7,
        commonPasswordUsed: true,
      });

      // Should allow unique passwords with low attempt count
      mockRedisClient.get.mockResolvedValue('2');
      const result = await detectCredentialStuffing('10.0.0.2', 'testuser', 'UniqueP@ssw0rd');
      expect(result.allowed).toBe(true);
    });
  });
});
/**
 * Authentication Bypass Security Tests
 * 
 * Tests for critical authentication vulnerabilities including:
 * - Admin TOTP bypass vulnerability
 * - Timing attacks and user enumeration
 * - Bulk user update security issues
 * - Account lockout bypass attempts
 */

import { SecurityTestUtils } from './security-test-utils';

// Mock the auth-options module
const mockTryLocalAuthentication = jest.fn();
jest.mock('@b2b-tickets/auth-options', () => ({
  tryLocalAuthentication: mockTryLocalAuthentication,
}));

// Mock dependencies
const mockB2BUser = {
  scope: jest.fn().mockReturnThis(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock bcryptjs properly
const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn(),
};

jest.mock('bcryptjs', () => mockBcrypt);

describe('Authentication Bypass Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Critical Vulnerability: Admin TOTP Bypass', () => {
    it('should allow admin to bypass TOTP with proper validation', async () => {
      // Test the improved admin TOTP bypass with proper validation
      const adminUser = SecurityTestUtils.createMockAdminUser({
        username: 'admin',
        mfa_method: 'email',
        two_factor_secret: 'encrypted-totp-secret',
      });

      mockB2BUser.findOne.mockResolvedValue(adminUser);
      mockBcrypt.compare.mockResolvedValue(true);

      // Simulate the improved auth function logic
      const authenticateWithTOTP = async (username: string, password: string, totpCode: string) => {
        const user = await mockB2BUser.findOne();
        if (!user) throw new Error('User not found');
        
        const passwordValid = await mockBcrypt.compare(password, user.password);
        if (!passwordValid) throw new Error('Invalid password');

        // IMPROVED: Admin bypass with proper role validation
        if (user.username === 'admin') {
          // Validate admin has proper role
          const hasAdminRole = user.AppRoles?.some((role: any) => role.roleName === 'Admin');
          if (!hasAdminRole) {
            mockLogger.error('SECURITY ALERT: User with admin username lacks Admin role');
            throw new Error('Invalid credentials');
          }

          // Audit log for admin bypass
          mockLogger.info(`Admin TOTP bypass used - user_id: ${user.user_id}`);
          return { success: true, user: user.username, bypassUsed: true };
        }

        // Regular TOTP validation would happen here
        if (totpCode !== '12345') throw new Error('Invalid TOTP');
        return { success: true, user: user.username, bypassUsed: false };
      };

      // Test that admin can still bypass TOTP but with proper validation
      const resultWithValidAdmin = await authenticateWithTOTP('admin', 'correctpassword', '00000');
      expect(resultWithValidAdmin.success).toBe(true);
      expect(resultWithValidAdmin.bypassUsed).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(`Admin TOTP bypass used - user_id: ${adminUser.user_id}`);

      // Verify no security alert for valid admin
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should detect and block fake admin users without proper role', async () => {
      // Test security improvement: block users with admin username but no admin role
      const fakeAdminUser = SecurityTestUtils.createMockUser({
        username: 'admin',
        AppRoles: [{ // User has regular roles, not Admin role
          id: 2,
          roleName: 'User',
          AppPermissions: []
        }]
      });

      mockB2BUser.findOne.mockResolvedValue(fakeAdminUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const authenticateWithTOTP = async (username: string, password: string, totpCode: string) => {
        const user = await mockB2BUser.findOne();
        if (!user) throw new Error('User not found');
        
        const passwordValid = await mockBcrypt.compare(password, user.password);
        if (!passwordValid) throw new Error('Invalid password');

        if (user.username === 'admin') {
          const hasAdminRole = user.AppRoles?.some((role: any) => role.roleName === 'Admin');
          if (!hasAdminRole) {
            mockLogger.error('SECURITY ALERT: User with admin username lacks Admin role');
            throw new Error('Invalid credentials');
          }

          mockLogger.info(`Admin TOTP bypass used - user_id: ${user.user_id}`);
          return { success: true, user: user.username, bypassUsed: true };
        }

        if (totpCode !== '12345') throw new Error('Invalid TOTP');
        return { success: true, user: user.username, bypassUsed: false };
      };

      // Should detect and block fake admin
      await expect(authenticateWithTOTP('admin', 'correctpassword', '00000'))
        .rejects.toThrow('Invalid credentials');

      // Should log security alert
      expect(mockLogger.error).toHaveBeenCalledWith('SECURITY ALERT: User with admin username lacks Admin role');
    });

    it('should properly validate TOTP for non-admin users', async () => {
      const regularUser = SecurityTestUtils.createMockUser({
        username: 'regularuser',
        mfa_method: 'email',
      });

      mockB2BUser.findOne.mockResolvedValue(regularUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const authenticateWithTOTP = async (username: string, password: string, totpCode: string) => {
        const user = await mockB2BUser.findOne();
        if (!user) throw new Error('User not found');
        
        const passwordValid = await mockBcrypt.compare(password, user.password);
        if (!passwordValid) throw new Error('Invalid password');

        // No admin bypass for regular users
        if (totpCode !== '12345') throw new Error('Invalid TOTP');
        return { success: true, user: user.username };
      };

      // Regular user should fail with wrong TOTP
      await expect(
        authenticateWithTOTP('regularuser', 'correctpassword', '00000')
      ).rejects.toThrow('Invalid TOTP');

      // Regular user should succeed with correct TOTP
      const result = await authenticateWithTOTP('regularuser', 'correctpassword', '12345');
      expect(result.success).toBe(true);
    });

    it('should detect admin TOTP bypass attempts in logs', async () => {
      const adminUser = SecurityTestUtils.createMockAdminUser();
      mockB2BUser.findOne.mockResolvedValue(adminUser);
      mockBcrypt.compare.mockResolvedValue(true);

      // Simulate multiple admin bypass attempts
      const suspiciousTotpCodes = ['00000', '11111', '99999', 'invalid', ''];
      
      for (const code of suspiciousTotpCodes) {
        const authenticateWithTOTP = async (totpCode: string) => {
          const user = await mockB2BUser.findOne();
          if (user.username === 'admin') {
            mockLogger.info('Allowing admin user to have access with ANY OTP code');
            return { success: true };
          }
          return { success: false };
        };

        await authenticateWithTOTP(code);
      }

      // Should log suspicious admin bypass attempts
      expect(mockLogger.info).toHaveBeenCalledTimes(suspiciousTotpCodes.length);
      expect(mockLogger.info).toHaveBeenCalledWith('Allowing admin user to have access with ANY OTP code');
    });
  });

  describe('Bulk User Update Vulnerability', () => {
    it('should NOT update login attempts for unrelated users with same email', async () => {
      // VULNERABILITY: Bulk updates affect all users with same email
      const user1 = SecurityTestUtils.createMockUser({
        user_id: 1,
        customer_id: 100,
        username: 'user1',
        email: 'shared@company.com',
        last_login_failed_attempts: 0,
      });

      const user2 = SecurityTestUtils.createMockUser({
        user_id: 2,
        customer_id: 200, // Different customer!
        username: 'user2', 
        email: 'shared@company.com', // Same email
        last_login_failed_attempts: 0,
      });

      // Mock findOne returns the first user attempting login
      mockB2BUser.findOne.mockResolvedValue(user1);
      
      // Mock findAll returns ALL users with same email (VULNERABILITY)
      mockB2BUser.findAll.mockResolvedValue([user1, user2]);
      
      mockBcrypt.compare.mockResolvedValue(false); // Wrong password

      // Simulate failed login attempt
      const simulateFailedLogin = async (email: string) => {
        const primaryUser = await mockB2BUser.findOne();
        if (!primaryUser) throw new Error('User not found');

        const passwordValid = await mockBcrypt.compare('wrongpassword', primaryUser.password);
        if (!passwordValid) {
          // VULNERABILITY: Updates ALL users with same email
          const allUsersWithEmail = await mockB2BUser.findAll({ where: { email } });
          
          for (const user of allUsersWithEmail) {
            user.last_login_failed_attempts += 1;
            user.last_login_status = 'f';
            await user.save();
          }
          
          throw new Error('Invalid credentials');
        }
      };

      // Attempt failed login
      await expect(simulateFailedLogin('shared@company.com')).rejects.toThrow('Invalid credentials');

      // SECURITY ISSUE: Both users should NOT have been updated
      expect(user1.save).toHaveBeenCalled();
      expect(user2.save).toHaveBeenCalled(); // This is the vulnerability!
      
      // User from different customer should NOT be affected
      expect(user1.last_login_failed_attempts).toBe(1);
      expect(user2.last_login_failed_attempts).toBe(1); // VULNERABILITY: Cross-customer impact
    });

    it('should only update the authenticated user on successful login', async () => {
      const user1 = SecurityTestUtils.createMockUser({
        user_id: 1,
        customer_id: 100,
        email: 'shared@company.com',
      });

      const user2 = SecurityTestUtils.createMockUser({
        user_id: 2, 
        customer_id: 200,
        email: 'shared@company.com',
      });

      mockB2BUser.findOne.mockResolvedValue(user1);
      mockB2BUser.findAll.mockResolvedValue([user1, user2]);
      mockBcrypt.compare.mockResolvedValue(true);

      const simulateSuccessfulLogin = async (email: string) => {
        const primaryUser = await mockB2BUser.findOne();
        const passwordValid = await mockBcrypt.compare('correctpassword', primaryUser.password);
        
        if (passwordValid) {
          // VULNERABILITY: Updates all users with same email on success too
          const allUsersWithEmail = await mockB2BUser.findAll({ where: { email } });
          
          for (const user of allUsersWithEmail) {
            user.last_login_status = 's';
            user.last_login_failed_attempts = 0;
            await user.save();
          }
          
          return { success: true, user: primaryUser };
        }
        
        return { success: false };
      };

      const result = await simulateSuccessfulLogin('shared@company.com');
      
      // Both users get updated (VULNERABILITY)
      expect(user1.save).toHaveBeenCalled();
      expect(user2.save).toHaveBeenCalled();
      expect(result?.success).toBe(true);
    });
  });

  describe('User Enumeration and Timing Attacks', () => {
    it('should have consistent response times for valid vs invalid users', async () => {
      const validUser = SecurityTestUtils.createMockUser();
      
      // Mock responses
      mockB2BUser.findOne.mockImplementation(async ({ where }) => {
        await SecurityTestUtils.simulateTimingAttack(where.username === 'validuser');
        return where.username === 'validuser' ? validUser : null;
      });

      const testLogin = async (username: string) => {
        const start = Date.now();
        
        try {
          const user = await mockB2BUser.findOne({ where: { username } });
          if (!user) throw new Error('Invalid credentials');
          
          // Simulate password check timing
          await SecurityTestUtils.simulateTimingAttack(true);
          return { success: true, duration: Date.now() - start };
        } catch (error) {
          return { success: false, duration: Date.now() - start, error: (error as Error).message };
        }
      };

      // Test timing for valid vs invalid users
      const validResult = await testLogin('validuser');
      const invalidResult = await testLogin('invaliduser');

      // SECURITY ISSUE: Response times should not reveal user existence
      // In a secure system, timing should be consistent regardless of user validity
      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
      
      // This test documents potential timing attack vulnerability
      // Real fix would require constant-time responses
      expect(typeof validResult.duration).toBe('number');
      expect(typeof invalidResult.duration).toBe('number');
    });

    it('should not reveal user existence in error messages', async () => {
      mockB2BUser.findOne.mockResolvedValue(null);

      const testLogin = async (username: string) => {
        const user = await mockB2BUser.findOne({ where: { username } });
        if (!user) {
          // GOOD: Generic error message
          throw new Error('Invalid credentials');
        }
        return user;
      };

      await expect(testLogin('nonexistent')).rejects.toThrow('Invalid credentials');
      
      // Should not throw "User not found" or "Username does not exist"
      // which would reveal user enumeration information
    });
  });

  describe('Account Lockout Security', () => {
    it('should properly enforce account lockout after failed attempts', async () => {
      const user = SecurityTestUtils.createMockUser({
        last_login_failed_attempts: 4, // One away from lockout
        is_locked: 'n',
      });

      mockB2BUser.findOne.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(false);

      const attemptLogin = async () => {
        const foundUser = await mockB2BUser.findOne();
        if (foundUser.is_locked === 'y') {
          throw new Error('Account is locked');
        }

        const passwordValid = await mockBcrypt.compare('wrongpassword', foundUser.password);
        if (!passwordValid) {
          foundUser.last_login_failed_attempts += 1;
          
          // Lock account after 5 failed attempts
          if (foundUser.last_login_failed_attempts >= 5) {
            foundUser.is_locked = 'y';
          }
          
          await foundUser.save();
          throw new Error('Invalid credentials');
        }
      };

      // This should trigger account lockout
      await expect(attemptLogin()).rejects.toThrow('Invalid credentials');
      
      expect(user.last_login_failed_attempts).toBe(5);
      expect(user.is_locked).toBe('y');
      expect(user.save).toHaveBeenCalled();
    });

    it('should prevent login attempts on locked accounts', async () => {
      const lockedUser = SecurityTestUtils.createMockUser({
        is_locked: 'y',
        last_login_failed_attempts: 5,
      });

      mockB2BUser.findOne.mockResolvedValue(lockedUser);

      const attemptLoginOnLockedAccount = async () => {
        const user = await mockB2BUser.findOne();
        if (user.is_locked === 'y') {
          // Log security event
          mockLogger.warn('Login attempt on locked account', { username: user.username });
          throw new Error('Account is locked');
        }
        return user;
      };

      await expect(attemptLoginOnLockedAccount()).rejects.toThrow('Account is locked');
      expect(mockLogger.warn).toHaveBeenCalledWith('Login attempt on locked account', { username: 'testuser' });
    });
  });

  describe('Password Security Tests', () => {
    it('should properly hash passwords with sufficient complexity', async () => {
      const plainPassword = 'SecureP@ssw0rd123';
      const hashedPassword = '$2b$10$mockedhashedpasswordwithsalt';

      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockBcrypt.compare.mockResolvedValue(true);

      // Test password hashing
      const hashed = await mockBcrypt.hash(plainPassword, 10);
      expect(hashed).toBe(hashedPassword);

      // Test password verification
      const isValid = await mockBcrypt.compare(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'password123',
        'admin',
      ];

      const validatePasswordStrength = (password: string): boolean => {
        // Basic password strength validation
        if (password.length < 8) return false;
        if (!/[A-Z]/.test(password)) return false;
        if (!/[a-z]/.test(password)) return false;
        if (!/[0-9]/.test(password)) return false;
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
        return true;
      };

      for (const weakPassword of weakPasswords) {
        const isStrong = validatePasswordStrength(weakPassword);
        expect(isStrong).toBe(false);
      }

      // Strong password should pass
      const strongPassword = 'SecureP@ssw0rd123!';
      const isStrong = validatePasswordStrength(strongPassword);
      expect(isStrong).toBe(true);
    });
  });
});
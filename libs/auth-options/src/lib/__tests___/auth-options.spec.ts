import bcrypt from 'bcryptjs';
import { tryLocalAuthentication } from '../auth-options';
import {
  B2BUser,
  pgB2Bpool,
  setSchemaAndTimezone,
} from '@b2b-tickets/db-access';
import { CustomLogger } from '@b2b-tickets/logging';
import { ErrorCode } from '@b2b-tickets/shared-models';
import { performPasswordReset } from '@b2b-tickets/auth-options';
import { isValidEmail, getWhereObj } from '@b2b-tickets/utils';
import winston from 'winston';

jest.mock('bcryptjs');
jest.mock('@b2b-tickets/db-access');
jest.mock('@b2b-tickets/logging');

jest.mock('@b2b-tickets/utils', () => ({
  symmetricDecrypt: jest.fn(),
  isValidEmail: jest.fn(),
  getWhereObj: jest.fn(),
}));

// Mock the B2BUser model
jest.mock('@b2b-tickets/db-access', () => ({
  B2BUser: {
    scope: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    findAll: jest.fn(), // ⭐ ADD THIS - needed for bulk updates
  },
  pgB2Bpool: {
    query: jest.fn(),
  },
  setSchemaAndTimezone: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock CustomLogger class
jest.mock('@b2b-tickets/logging', () => {
  return {
    CustomLogger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    })),
  };
});

describe('Testing tryLocalAuthentication function', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(), // ⭐ ADD THIS - your updated code uses info logging
  };

  beforeEach(() => {
    // Clear previous mocks before each test
    jest.clearAllMocks();
  });

  it('should succeed if the email and token are valid', async () => {
    const credentials = { userName: 'validUser', password: 'validPassword' };

    const mockUser = {
      user_id: 1,
      customer_id: 100,
      username: 'validUser',
      password: '$2b$10$validhashedpassword',
      is_locked: 'n',
      last_login_failed_attempts: 0,
      last_login_status: 'i',
      last_login_attempt: new Date(),
      is_active: 'y',
      first_name: 'John',
      last_name: 'Doe',
      email: 'test@example.com',
      mobile_phone: '123456789',
      authentication_type: 'local',
      change_password: 'n',
      mfa_method: 'sms',
      save: jest.fn().mockResolvedValue(true),
      AppRoles: [
        {
          roleName: 'admin',
          AppPermissions: [
            {
              permissionName: 'view',
              endPoint: '/view',
              description: 'View permission',
            },
          ],
        },
      ],
    };

    // ⭐ Mock findOne (finds the first user)
    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser),
    });

    // ⭐ Mock findAll (gets all users with same email for bulk update)
    (B2BUser.findAll as jest.Mock).mockResolvedValue([mockUser]);

    // Mock bcrypt.compare to return true
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Mock pgB2Bpool.query to return customer name
    (pgB2Bpool.query as jest.Mock).mockResolvedValue({
      rows: [{ customer_name: 'Test Customer' }],
    });

    // Mock setSchemaAndTimezone
    (setSchemaAndTimezone as jest.Mock).mockResolvedValue(null);

    const result = await tryLocalAuthentication(
      credentials,
      mockLogger as unknown as CustomLogger
    );

    expect(result).toHaveProperty('userName', 'validUser');
    expect(result).toHaveProperty('customer_name', 'Test Customer');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Trying Local authentication for user name: validUser'
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Valid User Name/Password was provided'
    );

    // ⭐ Verify findAll was called
    expect(B2BUser.findAll).toHaveBeenCalled();
  });

  it('should throw an error if the user is locked', async () => {
    const credentials = { userName: 'lockedUser', password: 'validPassword' };

    const mockUser = {
      user_id: 1,
      customer_id: 100,
      username: 'lockedUser',
      password: '$2b$10$validhashedpassword',
      is_locked: 'y',
      is_active: 'y',
      first_name: 'John',
      last_name: 'Doe',
      email: 'test@example.com',
      mobile_phone: '123456789',
      authentication_type: 'local',
      change_password: 'n',
      mfa_method: 'sms',
      last_login_status: 'i',
      last_login_failed_attempts: 0,
      last_login_attempt: new Date(),
      save: jest.fn().mockResolvedValue(true),
    };

    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser),
    });

    // ⭐ Mock findAll for bulk update
    (B2BUser.findAll as jest.Mock).mockResolvedValue([mockUser]);

    await expect(
      tryLocalAuthentication(credentials, mockLogger as unknown as CustomLogger)
    ).rejects.toThrow(ErrorCode.UserIsLocked);

    expect(mockLogger.error).toHaveBeenCalledWith(
      "User with user name 'lockedUser' is currently locked"
    );

    // ⭐ Verify all user records were updated
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('should throw an error if the user is inactive', async () => {
    const credentials = { userName: 'inactiveUser', password: 'validPassword' };

    const mockUser = {
      user_id: 1,
      customer_id: 100,
      username: 'inactiveUser',
      password: '$2b$10$validhashedpassword',
      is_locked: 'n',
      is_active: 'n',
      first_name: 'John',
      last_name: 'Doe',
      email: 'test@example.com',
      mobile_phone: '123456789',
      authentication_type: 'local',
      change_password: 'n',
      mfa_method: 'sms',
      last_login_status: 'i',
      last_login_failed_attempts: 0,
      last_login_attempt: new Date(),
      save: jest.fn().mockResolvedValue(true),
    };

    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser),
    });

    // ⭐ Mock findAll for bulk update
    (B2BUser.findAll as jest.Mock).mockResolvedValue([mockUser]);

    await expect(
      tryLocalAuthentication(credentials, mockLogger as unknown as CustomLogger)
    ).rejects.toThrow(ErrorCode.IncorrectUsernameOrPassword);

    expect(mockLogger.error).toHaveBeenCalledWith(
      "User with user name 'inactiveUser' is not currently active"
    );
  });

  it('should throw an error if password is incorrect', async () => {
    const credentials = {
      userName: 'validUser',
      password: 'incorrectPassword',
    };

    const mockUser = {
      user_id: 1,
      customer_id: 100,
      username: 'validUser',
      password: '$2b$10$validhashedpassword',
      is_locked: 'n',
      is_active: 'y',
      first_name: 'John',
      last_name: 'Doe',
      email: 'test@example.com',
      mobile_phone: '123456789',
      authentication_type: 'local',
      change_password: 'n',
      mfa_method: 'sms',
      last_login_status: 'i',
      last_login_failed_attempts: 0,
      last_login_attempt: new Date(),
      save: jest.fn().mockResolvedValue(true),
    };

    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser),
    });

    // ⭐ Mock findAll for bulk update
    (B2BUser.findAll as jest.Mock).mockResolvedValue([mockUser]);

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      tryLocalAuthentication(credentials, mockLogger as unknown as CustomLogger)
    ).rejects.toThrow(ErrorCode.IncorrectUsernameOrPassword);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Incorrect password provided'
    );
  });

  it('should throw an error if the username is incorrect', async () => {
    const credentials = { userName: 'wrongUser', password: 'validPassword' };

    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      tryLocalAuthentication(credentials, mockLogger as unknown as CustomLogger)
    ).rejects.toThrow(ErrorCode.IncorrectUsernameOrPassword);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Incorrect user name provided'
    );
  });

  // Multiple users with same email
  it('should update all user records with the same email on successful login', async () => {
    const credentials = {
      userName: 'test@example.com',
      password: 'validPassword',
    };

    const mockUser1 = {
      user_id: 1,
      customer_id: 100,
      username: 'user1',
      email: 'test@example.com',
      password: '$2b$10$validhashedpassword',
      is_locked: 'n',
      is_active: 'y',
      first_name: 'John',
      last_name: 'Doe',
      mobile_phone: '123456789',
      authentication_type: 'local',
      change_password: 'n',
      mfa_method: 'sms',
      last_login_status: 'i',
      last_login_failed_attempts: 0,
      last_login_attempt: new Date(),
      save: jest.fn().mockResolvedValue(true),
      AppRoles: [
        {
          roleName: 'admin',
          AppPermissions: [
            {
              permissionName: 'view',
              endPoint: '/view',
              description: 'View permission',
            },
          ],
        },
      ],
    };

    const mockUser2 = {
      ...mockUser1,
      user_id: 2,
      customer_id: 200,
      username: 'user2',
      save: jest.fn().mockResolvedValue(true),
    };

    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser1),
    });

    // Mock findAll returns multiple users
    (B2BUser.findAll as jest.Mock).mockResolvedValue([mockUser1, mockUser2]);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (pgB2Bpool.query as jest.Mock).mockResolvedValue({
      rows: [{ customer_name: 'Test Customer' }],
    });
    (setSchemaAndTimezone as jest.Mock).mockResolvedValue(null);
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (getWhereObj as jest.Mock).mockReturnValue({ email: 'test@example.com' });

    const result = await tryLocalAuthentication(
      credentials,
      mockLogger as unknown as CustomLogger
    );

    // Verify the function returns the correct user details
    expect(result).toHaveProperty('userName', 'user1');
    expect(result).toHaveProperty('email', 'test@example.com');
    expect(result).toHaveProperty('customer_name', 'Test Customer');

    // Verify both user records were updated (bulk update logic)
    expect(mockUser1.save).toHaveBeenCalled();
    expect(mockUser2.save).toHaveBeenCalled();

    // Verify findAll was called to get all user records with same email
    expect(B2BUser.findAll).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });

    // Verify login status was updated to successful for both users
    expect(mockUser1.last_login_status).toBe('s');
    expect(mockUser1.last_login_failed_attempts).toBe(0);
    expect(mockUser2.last_login_status).toBe('s');
    expect(mockUser2.last_login_failed_attempts).toBe(0);
  });
});

describe('Testing performPasswordReset function', () => {
  let mockLogger: CustomLogger;
  let mockFoundUser: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as CustomLogger;

    // Setup mock user
    mockFoundUser = {
      password: 'hashedPassword',
      change_password: 'y',
      password_change_date: new Date(),
      save: jest.fn().mockResolvedValue(true),
    };

    // Default mock implementations
    (B2BUser.scope as jest.Mock).mockReturnValue(B2BUser);
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (getWhereObj as jest.Mock).mockReturnValue({ email: 'test@example.com' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('should successfully reset password when valid credentials are provided', async () => {
    // Arrange
    const credentials = {
      userName: 'test@example.com',
      password: 'currentPassword',
      newPassword: 'newSecurePassword123',
    };

    (B2BUser.findOne as jest.Mock).mockResolvedValue(mockFoundUser);

    // Act
    const result = await performPasswordReset(credentials, mockLogger);

    // Assert
    expect(result).toBe(true);
    expect(mockFoundUser.password).toBe('newSecurePassword123');
    expect(mockFoundUser.change_password).toBe('n');
    expect(mockFoundUser.save).toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Performing Password Reset for user name: test@example.com'
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Given password and DB passwords match'
    );
  });

  // ... rest of your performPasswordReset tests remain the same

  it('should throw error when user is not found', async () => {
    const credentials = {
      userName: 'nonexistent@example.com',
      password: 'password',
      newPassword: 'newPassword',
    };

    (B2BUser.findOne as jest.Mock).mockResolvedValue(null);

    await expect(performPasswordReset(credentials, mockLogger)).rejects.toThrow(
      ErrorCode.IncorrectUsernameOrPassword
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Incorrect user name provided'
    );
  });

  it('should throw error when password does not match', async () => {
    const credentials = {
      userName: 'test@example.com',
      password: 'wrongPassword',
      newPassword: 'newPassword',
    };

    (B2BUser.findOne as jest.Mock).mockResolvedValue(mockFoundUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(performPasswordReset(credentials, mockLogger)).rejects.toThrow(
      ErrorCode.IncorrectUsernameOrPassword
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Incorrect password provided'
    );
  });

  it('should throw error when new password is not provided', async () => {
    const credentials = {
      userName: 'test@example.com',
      password: 'currentPassword',
    };

    (B2BUser.findOne as jest.Mock).mockResolvedValue(mockFoundUser);

    await expect(performPasswordReset(credentials, mockLogger)).rejects.toThrow(
      ErrorCode.NewPasswordRequired
    );
  });

  it('should handle username as non-email identifier', async () => {
    const credentials = {
      userName: 'testUsername',
      password: 'currentPassword',
      newPassword: 'newSecurePassword123',
    };

    (isValidEmail as jest.Mock).mockReturnValue(false);
    (getWhereObj as jest.Mock).mockReturnValue({ username: 'testUsername' });
    (B2BUser.findOne as jest.Mock).mockResolvedValue(mockFoundUser);

    const result = await performPasswordReset(credentials, mockLogger);

    expect(result).toBe(true);
    expect(getWhereObj).toHaveBeenCalledWith(credentials, false);
  });

  it('should handle undefined credentials gracefully', async () => {
    const credentials = undefined;

    await expect(
      performPasswordReset(credentials, mockLogger)
    ).rejects.toThrow();

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Performing Password Reset for user name: Not Given'
    );
  });

  it('should throw error when username is null in credentials object', async () => {
    const credentials = {
      userName: null,
      password: 'currentPassword',
      newPassword: 'newSecurePassword123',
    };

    await expect(performPasswordReset(credentials, mockLogger)).rejects.toThrow(
      ErrorCode.UserNotFound
    );
  });
});

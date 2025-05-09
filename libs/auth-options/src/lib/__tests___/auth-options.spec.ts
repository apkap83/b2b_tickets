import bcrypt from 'bcryptjs';
import { tryLocalAuthentication } from '../auth-options';
import { B2BUser, pgB2Bpool } from '@b2b-tickets/db-access';
import { CustomLogger } from '@b2b-tickets/logging';
import { ErrorCode } from '@b2b-tickets/shared-models';

jest.mock('bcryptjs');
jest.mock('@b2b-tickets/db-access');
jest.mock('@b2b-tickets/logging');

describe('tryLocalAuthentication', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
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
      is_active: 'y',
      first_name: 'John',
      last_name: 'Doe',
      email: 'test@example.com',
      mobile_phone: '123456789',
      authentication_type: 'local',
      change_password: 'n',
      mfa_method: 'sms',
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

    // Mocking the ORM methods
    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser),
    });

    // Mock bcrypt.compare to return true
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Mock pgB2Bpool.query to return customer name
    (pgB2Bpool.query as jest.Mock).mockResolvedValue({
      rows: [{ customer_name: 'Test Customer' }],
    });

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
    };

    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser),
    });

    await expect(
      tryLocalAuthentication(credentials, mockLogger as unknown as CustomLogger)
    ).rejects.toThrow(ErrorCode.UserIsLocked);

    expect(mockLogger.error).toHaveBeenCalledWith(
      "User with user name 'lockedUser' is currently locked"
    );
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
    };

    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser),
    });

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
    };

    (B2BUser.scope as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockUser),
    });

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
});

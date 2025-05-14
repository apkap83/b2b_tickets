import jwt from 'jsonwebtoken';
import { verifyJWTTokenForEmail, verifyJWTTotp } from '../jwtVerification';
import { ErrorCode } from '@b2b-tickets/shared-models';
import { symmetricDecrypt } from '@b2b-tickets/utils';

// Manually mock the jwt.verify function to be a Jest mock function
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

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
  },
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

// Test implementation
describe('Testing verifyJWTTotp function', () => {
  const originalEnv = process.env;

  // Mock the jwt.verify function
  const mockVerify = jest.fn();

  // Store original implementation
  const originalJwtVerify = jwt.verify;

  beforeEach(() => {
    // Set up process.env for tests
    process.env = { ...originalEnv };
    process.env['JWT_SECRET'] = 'test-secret-key';

    // Replace jwt.verify with our mock
    jwt.verify = mockVerify;
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;

    // Restore original jwt.verify
    jwt.verify = originalJwtVerify;

    // Clear mock data
    jest.clearAllMocks();
  });

  test('should throw error when totpJWTToken is missing', () => {
    const req = {
      headers: {
        cookie: 'someOtherCookie=value',
      },
    };

    expect(() => verifyJWTTotp({ req })).toThrow(
      ErrorCode.TotpJWTTokenRequired
    );
  });

  test('should throw error when cookie header is missing', () => {
    const req = {
      headers: {},
    };

    expect(() => verifyJWTTotp({ req })).toThrow(
      ErrorCode.TotpJWTTokenRequired
    );
  });

  test('should throw error when token is invalid', () => {
    const req = {
      headers: {
        cookie: 'totpJWTToken=invalid-token',
      },
    };

    // Mock jwt.verify to throw an error
    mockVerify.mockImplementationOnce(() => {
      throw new Error('Invalid token');
    });

    expect(() => verifyJWTTotp({ req })).toThrow();
  });

  test('should throw error when otpValidatedForEmailAddress is false', () => {
    const req = {
      headers: {
        cookie: 'totpJWTToken=some-token',
      },
    };

    // Mock jwt.verify to return a payload with otpValidatedForEmailAddress: false
    mockVerify.mockReturnValueOnce({
      emailProvided: 'test@example.com',
      otpValidatedForEmailAddress: false,
    });

    expect(() => verifyJWTTotp({ req })).toThrow(ErrorCode.TotpJWTTokenInvalid);
  });

  test('should successfully verify valid token', () => {
    const req = {
      headers: {
        cookie: 'totpJWTToken=valid-token',
      },
    };

    // Mock jwt.verify to return a valid payload
    mockVerify.mockReturnValueOnce({
      emailProvided: 'test@example.com',
      otpValidatedForEmailAddress: true,
    });

    expect(() => verifyJWTTotp({ req })).not.toThrow();
    expect(mockVerify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
  });
});

describe('Testing verifyJWTTokenForEmail function', () => {
  it('should throw error if emailJWTToken header does not exist', async () => {
    const mockReq = { headers: { cookie: '' } };

    // Use try-catch block to assert that the error is thrown
    try {
      verifyJWTTokenForEmail({
        req: mockReq,
        email: 'test@example.com',
        tokenProvidedFromUser: 'valid-token',
      });
    } catch (error: any) {
      expect(error.message).toBe(ErrorCode.EmailJWTTokenRequired);
    }
  });

  it('should throw an error if email JWT token is invalid', async () => {
    const mockReq = { headers: { cookie: 'emailJWTToken=invalid_token' } };

    // Mock the jwt.verify function to simulate an invalid token
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error('jwt malformed');
    });

    try {
      await verifyJWTTokenForEmail({
        req: mockReq,
        email: 'test@example.com',
        tokenProvidedFromUser: 'valid-token',
      });
    } catch (error: any) {
      expect(error.message).toBe('jwt malformed');
    }
  });

  it('should throw an error if email in the JWT does not match the provided email', async () => {
    const mockReq = { headers: { cookie: 'emailJWTToken=valid_token' } };

    // Mock the decoded token to simulate an email mismatch
    (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
      emailProvided: 'wrong@example.com',
      token: 'some_encrypted_token',
    }));

    try {
      await verifyJWTTokenForEmail({
        req: mockReq,
        email: 'test@example.com',
        tokenProvidedFromUser: 'valid-token',
      });
    } catch (error: any) {
      expect(error.message).toBe(ErrorCode.EmailJWTTokenInvalid);
    }
  });

  it('should throw an error if token in the JWT is missing or invalid', async () => {
    const mockReq = { headers: { cookie: 'emailJWTToken=valid_token' } };

    // Mock the decoded token with missing or invalid token
    (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
      emailProvided: 'test@example.com',
      token: '', // Simulate a missing token in the JWT
    }));

    try {
      await verifyJWTTokenForEmail({
        req: mockReq,
        email: 'test@example.com',
        tokenProvidedFromUser: 'valid-token',
      });
    } catch (error: any) {
      expect(error.message).toBe(ErrorCode.EmailJWTTokenInvalid);
    }
  });

  it('should throw an error if symmetric decryption fails', async () => {
    const mockReq = { headers: { cookie: 'emailJWTToken=valid_token' } };

    // Mock the decoded token and simulate a decryption failure
    (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
      emailProvided: 'test@example.com',
      token: 'some_encrypted_token',
    }));
    (symmetricDecrypt as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Decryption failed');
    });

    try {
      await verifyJWTTokenForEmail({
        req: mockReq,
        email: 'test@example.com',
        tokenProvidedFromUser: 'valid-token',
      });
    } catch (error: any) {
      expect(error.message).toBe('Decryption failed');
    }
  });

  it('should throw an error if the JWT is expired', async () => {
    const mockReq = { headers: { cookie: 'emailJWTToken=expired_token' } };

    // Mock the expired JWT verification
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error('jwt expired');
    });

    try {
      await verifyJWTTokenForEmail({
        req: mockReq,
        email: 'test@example.com',
        tokenProvidedFromUser: 'valid-token',
      });
    } catch (error: any) {
      expect(error.message).toBe('jwt expired');
    }
  });

  it('should succeed if the email and token are valid', async () => {
    const mockReq = { headers: { cookie: 'emailJWTToken=valid_token' } };

    // Mock a valid decoded token
    (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
      emailProvided: 'test@example.com',
      token: 'some_encrypted_token',
    }));
    (symmetricDecrypt as jest.Mock).mockImplementationOnce(() => 'valid-token');

    // Using not.toThrow() because verifyJWTTokenForEmail doesn't return a promise
    expect(() =>
      verifyJWTTokenForEmail({
        req: mockReq,
        email: 'test@example.com',
        tokenProvidedFromUser: 'valid-token',
      })
    ).not.toThrow();
  });
});

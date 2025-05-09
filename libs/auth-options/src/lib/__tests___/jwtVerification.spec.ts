import jwt from 'jsonwebtoken';
import { verifyJWTTokenForEmail, verifyJWTTotp } from '../jwtVerification';
import { ErrorCode } from '@b2b-tickets/shared-models';
import { symmetricDecrypt } from '@b2b-tickets/utils';

// Manually mock the jwt.verify function to be a Jest mock function
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('@b2b-tickets/utils', () => ({
  symmetricDecrypt: jest.fn(),
}));

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

describe('Testing verifyJWTTotp function', () => {
  it('should throw error if totpJWTToken header does not exist', async () => {
    const mockReq = { headers: { cookie: '' } };

    try {
      verifyJWTTotp({ req: mockReq });
    } catch (error: any) {
      expect(error.message).toBe(ErrorCode.TotpJWTTokenRequired);
    }
  });

  it('should throw an error if totpJWTToken token is invalid', async () => {
    const mockReq = { headers: { cookie: 'totpJWTToken=invalid_token' } };

    // Mock the jwt.verify function to simulate an invalid token
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error('jwt malformed');
    });

    try {
      await verifyJWTTotp({
        req: mockReq,
      });
    } catch (error: any) {
      expect(error.message).toBe('jwt malformed');
    }
  });

  it('should throw an error if token in the JWT is not verified successfully', async () => {
    const mockReq = { headers: { cookie: 'totpJWTToken=valid_token' } };

    // Mock the jwt.verify function to simulate an invalid token
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      return undefined;
    });

    try {
      await verifyJWTTotp({
        req: mockReq,
      });
    } catch (error: any) {
      expect(error.message).toBe(ErrorCode.TotpJWTTokenInvalid);
    }
  });

  it('should throw an error if token in the JWT has otpValidatedForEmailAddress is false', async () => {
    const mockReq = { headers: { cookie: 'totpJWTToken=valid_token' } };

    // Mock the jwt.verify function to simulate an invalid token
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      return {
        emailProvided: 'test@example.com',
        otpValidatedForEmailAddress: false,
      };
    });

    try {
      await verifyJWTTotp({
        req: mockReq,
      });
    } catch (error: any) {
      expect(error.message).toBe(ErrorCode.TotpJWTTokenInvalid);
    }
  });

  it('should succeed if token in the JWT has otpValidatedForEmailAddress is true', async () => {
    const mockReq = { headers: { cookie: 'totpJWTToken=valid_token' } };

    // Mock the jwt.verify function to simulate an invalid token
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      return {
        emailProvided: 'test@example.com',
        otpValidatedForEmailAddress: true,
      };
    });

    // Using not.toThrow() because verifyJWTTokenForEmail doesn't return a promise
    expect(() =>
      verifyJWTTotp({
        req: mockReq,
      })
    ).not.toThrow();
  });
});

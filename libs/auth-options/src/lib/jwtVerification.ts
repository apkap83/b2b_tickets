import jwt from 'jsonwebtoken';
import { symmetricDecrypt } from '@b2b-tickets/utils';
import { ErrorCode } from '@b2b-tickets/shared-models';

export function verifyJWTTotp({ req }: { req: any }) {
  const cookies = req.headers?.cookie || '';
  const totpJWTToken = cookies.match(/totpJWTToken=([^;]+)/)?.[1];

  // Verify the JWT token
  try {
    if (!totpJWTToken) {
      throw new Error(ErrorCode.TotpJWTTokenRequired);
    }

    const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key :-)';

    type DecodedJWTType = {
      emailProvided: string;
      otpValidatedForEmailAddress: boolean;
    };

    const decoded = jwt.verify(totpJWTToken, JWT_SECRET) as DecodedJWTType;
    if (!decoded) {
      throw new Error(ErrorCode.TotpJWTTokenInvalid);
    }

    if (!decoded.otpValidatedForEmailAddress)
      throw new Error(ErrorCode.TotpJWTTokenInvalid);
  } catch (error) {
    // Handle invalid token error (expired, tampered with, etc.)
    throw error;
  }
}

export function verifyJWTTokenForEmail({
  req,
  email,
  tokenProvidedFromUser,
}: {
  req: any;
  email: string;
  tokenProvidedFromUser: string;
}) {
  const cookies = req.headers?.cookie || '';
  const emailJWTToken = cookies.match(/emailJWTToken=([^;]+)/)?.[1];

  // Verify the JWT token
  try {
    if (!emailJWTToken) {
      throw new Error(ErrorCode.EmailJWTTokenRequired);
    }

    const JWT_SECRET = process.env['JWT_SECRET']!;
    const decoded = jwt.verify(emailJWTToken, JWT_SECRET) as {
      emailProvided: string;
      token: string;
    };
    if (!decoded) {
      throw new Error(ErrorCode.EmailJWTTokenInvalid);
    }

    if (email !== decoded.emailProvided) {
      throw new Error(ErrorCode.EmailJWTTokenInvalid);
    }

    if (!decoded.token) {
      throw new Error(ErrorCode.EmailJWTTokenInvalid);
    }

    // Decrypt token in JWT
    const decryptedToken = symmetricDecrypt(decoded.token);

    if (decryptedToken !== tokenProvidedFromUser) {
      throw new Error(ErrorCode.IncorrectPassResetTokenProvided);
    }
  } catch (error) {
    // Handle invalid token error (expired, tampered with, etc.)
    throw error;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { TransportName } from '@b2b-tickets/shared-models';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';
import { authenticator } from 'otplib';
import { B2BUser } from '@b2b-tickets/db-access';
import { symmetricDecrypt } from '@b2b-tickets/utils';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use an environment variable in production

export async function POST(req: NextRequest) {
  const logRequest = await getRequestLogger(TransportName.AUTH);
  try {
    if (req.method !== 'POST') {
      return NextResponse.json(
        { message: 'Method Not Allowed' },
        { status: 405 }
      );
    }

    const body = await req.json(); // Extract JSON from request
    const { emailProvided, totpCode } = body;

    // Find User By email address
    const foundUser = await B2BUser.findOne({
      where: {
        email: emailProvided,
      },
    });

    if (!foundUser) {
      return NextResponse.json(
        { message: 'Email address invalid' },
        { status: 400 }
      );
    }

    // Validate OTP
    const secret = symmetricDecrypt(
      foundUser.two_factor_secret!,
      process.env.ENCRYPTION_KEY!
    );

    const isValidToken = authenticator.check(totpCode, secret);
    if (!isValidToken) {
      logRequest.error(
        `Invalid Token Provided for Password Reset -> ${totpCode}`
      );
      return NextResponse.json(
        { message: `Token Provided is invalid` },
        { status: 400 }
      );
    }

    // Generate a JWT token after successful captcha validation
    const token = jwt.sign(
      { emailProvided, otpValidatedForEmailAddress: true }, // Payload
      JWT_SECRET, // Secret key
      { expiresIn: '5m' } // Token is valid for 5 minutes
    );

    logRequest.info(`OTP Validated for E-mail address ${emailProvided}`);

    // Set the token in an httpOnly cookie
    const response = NextResponse.json(
      { message: `OTP Validated for E-mail address ${emailProvided}` },
      { status: 200 }
    );

    response.headers.set(
      'Set-Cookie',
      serialize('totpJWTToken', token, {
        path: '/',
        httpOnly: true, // Ensure cookie is not accessible via JavaScript
        maxAge: 300, // 300 seconds (5 minutes)
        secure: process.env.NODE_ENV === 'production', // Set to true in production
      })
    );

    return response;
  } catch (error) {
    // Catch any unexpected errors and return a JSON response
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

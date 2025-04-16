import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { TransportName } from '@b2b-tickets/shared-models';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';
import { authenticator } from 'otplib';
import { B2BUser } from '@b2b-tickets/db-access';
import { symmetricDecrypt } from '@b2b-tickets/utils';
import { config } from '@b2b-tickets/config';
import {
  logFaultyOTPAttempt,
  clearFaultyOTPAttempts,
  maxOTPAttemptsReached,
} from '@b2b-tickets/totp-service/server';
import { validateOTPCodeForUserThroughRedis } from '@b2b-tickets/totp-service/server';
import { NextApiRequest } from 'next';

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
    const body = await req.json();
    const { emailProvided, totpCode } = body;
    const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';

    // Find User By email address
    const foundUser = await B2BUser.findOne({
      where: {
        email: emailProvided,
      },
    });

    if (!foundUser) {
      // Introduce a delay before returning error response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return NextResponse.json(
        { message: 'Error during TOTP operation' },
        { status: 400 }
      );
    }

    const userName = foundUser.username;

    const myRequestObj = {
      headers: {
        'x-forwarded-for': ip,
      },
      body: {
        userName,
      },
    };

    // Validate Saved OTP In Redis for Source IP & User Name
    const otpProvidedCorrect = await validateOTPCodeForUserThroughRedis(
      //@ts-ignore
      myRequestObj as NextApiRequest,
      totpCode
    );
    let remainingAttempts;
    if (typeof otpProvidedCorrect === 'object') {
      remainingAttempts = otpProvidedCorrect.remainingOTPAttempts;

      // Max Attempts Reached
      if (remainingAttempts! <= 0) {
        return NextResponse.json(
          {
            error: `Too many OTP attempts. Banned for ${Math.floor(
              config.maxOTPAttemptsBanTimeInSec / 60
            )} minutes`,
            remainingAttempts: 0,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          message: `Incorrect Token provided`,
          remainingAttempts: remainingAttempts,
        },
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
        maxAge: config.totpJWTTokenCookieValidityInSec, // 300 seconds (5 minutes)
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

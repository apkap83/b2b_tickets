import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { TransportName } from '@b2b-tickets/shared-models';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';
import { B2BUser } from '@b2b-tickets/db-access';
import { generateResetToken, symmetricEncrypt } from '@b2b-tickets/utils';
import { sendEmailForPasswordReset } from '@b2b-tickets/email-service/server';
import { EmailNotificationType } from '@b2b-tickets/shared-models';
import { config } from '@b2b-tickets/config';
import { logTokenOTPAttempt } from '@b2b-tickets/totp-service/server';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key'; // Use an environment variable in production

export async function POST(req: NextRequest) {
  const logRequest = await getRequestLogger(TransportName.AUTH);

  try {
    if (req.method !== 'POST') {
      return NextResponse.json(
        { message: 'Method Not Allowed' },
        { status: 405 }
      );
    }

    const { eligibleForNewOtpAttempt, remainingOTPAttempts } =
      await logTokenOTPAttempt(req);

    if (!eligibleForNewOtpAttempt) {
      return NextResponse.json(
        {
          error: `Too many Token attempts. Banned for ${Math.floor(
            config.maxTokenAttemptsBanTimeInSec / 60
          )} minutes`,
          remainingAttempts: 0,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { emailProvided } = body;

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

    const emailToken = generateResetToken();
    // SEND EMAIL HERE to email
    logRequest.info(
      `'*** Email: ${emailProvided} - Token Code for Pass Reset: ${emailToken}`
    );
    sendEmailForPasswordReset(
      EmailNotificationType.RESET_TOKEN,
      foundUser.email,
      emailToken
    );
    const encryptedSecret = symmetricEncrypt(emailToken);

    // Generate a JWT token
    const token = jwt.sign(
      { emailProvided, token: encryptedSecret },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    // Set the token in an httpOnly cookie
    const response = NextResponse.json(
      { message: `Token For E-mail address ${emailProvided}` },
      { status: 200 }
    );

    response.headers.set(
      'Set-Cookie',
      serialize('emailJWTToken', token, {
        path: '/',
        httpOnly: true,
        maxAge: config.emailJWTTokenCookieValidityInSec,
        secure: process.env.NODE_ENV === 'production',
      })
    );

    return response;
  } catch (error) {
    logRequest.error(error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

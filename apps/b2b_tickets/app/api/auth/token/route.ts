import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { TransportName } from '@b2b-tickets/shared-models';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';
import { authenticator } from 'otplib';
import { B2BUser } from '@b2b-tickets/db-access';
import { symmetricDecrypt } from '@b2b-tickets/utils';
import { generateResetToken, symmetricEncrypt } from '@b2b-tickets/utils';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use an environment variable in production

export async function POST(req: NextRequest) {
  try {
    const logRequest = getRequestLogger(TransportName.AUTH);
    if (req.method !== 'POST') {
      return NextResponse.json(
        { message: 'Method Not Allowed' },
        { status: 405 }
      );
    }

    const body = await req.json(); // Extract JSON from request
    const { email } = body;

    // Find User By email address
    const foundUser = (await B2BUser.findOne({
      where: {
        email,
      },
    })) as B2BUser;

    if (!foundUser) {
      return NextResponse.json(
        { message: 'Email address invalid' },
        { status: 400 }
      );
    }

    const emailToken = generateResetToken();
    // SEND EMAIL HERE to email
    logRequest.info(
      `'*** Emai: ${email} - Token Code for Pass Reset: ${emailToken}`
    );

    const encryptedSecret = symmetricEncrypt(
      emailToken,
      process.env['ENCRYPTION_KEY']!
    );

    // Generate a JWT token
    const token = jwt.sign(
      { token: encryptedSecret }, // Payload
      JWT_SECRET, // Secret key
      { expiresIn: '5m' } // Token is valid for 5 minutes
    );

    // Set the token in an httpOnly cookie
    const response = NextResponse.json(
      { message: `Token For E-mail address ${email}` },
      { status: 200 }
    );

    response.headers.set(
      'Set-Cookie',
      serialize('emailJWTToken', token, {
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

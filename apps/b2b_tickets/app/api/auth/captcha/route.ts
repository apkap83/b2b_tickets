import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { validateReCaptcha } from '@b2b-tickets/server-actions';
import { TransportName } from '@b2b-tickets/shared-models';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';

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
    const { emailProvided, captchaToken } = body;

    // Validate the captcha token
    const reCaptchaSuccessResponse = await validateReCaptcha(captchaToken);

    if (!reCaptchaSuccessResponse) {
      return NextResponse.json(
        { message: 'Invalid reCAPTCHA' },
        { status: 400 }
      );
    }

    logRequest.info('Trying to validate ReCaptcha in Google..');
    // Generate a JWT token after successful captcha validation
    const token = jwt.sign(
      { emailProvided, captchaValidated: true }, // Payload
      JWT_SECRET, // Secret key
      { expiresIn: '5m' } // Token is valid for 5 minutes
    );

    logRequest.info('ReCaptcha successfully authenticated!');

    // Set the token in an httpOnly cookie
    const response = NextResponse.json(
      { message: 'Captcha validated successfully' },
      { status: 200 }
    );
    response.headers.set(
      'Set-Cookie',
      serialize('captchaJWTToken', token, {
        path: '/',
        httpOnly: true, // Ensure cookie is not accessible via JavaScript
        maxAge: 300, // 300 seconds (5 minutes)
        secure: process.env.NODE_ENV === 'production', // Set to true in production
      })
    );

    return response;
  } catch (error) {
    // Catch any unexpected errors and return a JSON response
    console.error('Server error in captchaHandler:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

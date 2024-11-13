import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { TransportName, B2BUserType } from '@b2b-tickets/shared-models';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';
import { authenticator } from 'otplib';
import { symmetricDecrypt } from '@b2b-tickets/utils';
import { B2BUser } from '@b2b-tickets/db-access';

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
    const { jwtTokenEnc } = body;

    // Check if jwtTokenEnc is provided
    if (!jwtTokenEnc) {
      logRequest.error('No jwtTokenEnc provided in the request');
      return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
    }

    // Decrypt JSON Web Token
    const decryptedJWT = symmetricDecrypt(
      decodeURIComponent(jwtTokenEnc),
      //@ts-ignore
      process.env['ENCRYPTION_KEY']
    );

    interface MyJwtPayload extends JwtPayload {
      userName: string;
      email: string;
      is_active: string;
      is_locked: string;
    }

    // Validate JSON Web Token
    const decodedJWT = jwt.verify(decryptedJWT, JWT_SECRET) as MyJwtPayload;
    const { email } = decodedJWT;

    // Find User By email address
    const foundUser: B2BUserType = await B2BUser.findOne({
      where: {
        email: email,
      },
    });

    if (
      !foundUser ||
      foundUser.is_active === 'n' ||
      foundUser.is_locked === 'y'
    ) {
      return NextResponse.json(
        { message: 'Invalid User in Token' },
        { status: 400 }
      );
    }

    logRequest.info(
      `Returning Correct E-mail ${foundUser.email} for Password Reset Procedure`
    );

    // Set the token in an httpOnly cookie
    const response = NextResponse.json(
      { email: foundUser.email },
      { status: 200 }
    );

    return response;
  } catch (error) {
    logRequest.error(error);
    // Catch any unexpected errors and return a JSON response
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

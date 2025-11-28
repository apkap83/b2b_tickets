// app/api/clearCookies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

export async function POST(req: NextRequest) {
  try {
    // Extract JWT tokens from cookies for validation
    const cookieHeader = req.headers.get('cookie');
    const emailJWTToken = extractCookieValue(cookieHeader, 'emailJWTToken');
    const totpJWTToken = extractCookieValue(cookieHeader, 'totpJWTToken');
    const captchaJWTToken = extractCookieValue(cookieHeader, 'captchaJWTToken');

    // Validate that at least one valid JWT token exists
    let hasValidToken = false;
    
    if (emailJWTToken) {
      try {
        jwt.verify(emailJWTToken, JWT_SECRET);
        hasValidToken = true;
      } catch (error) {
        // Token invalid, continue checking others
      }
    }
    
    if (!hasValidToken && totpJWTToken) {
      try {
        jwt.verify(totpJWTToken, JWT_SECRET);
        hasValidToken = true;
      } catch (error) {
        // Token invalid, continue checking others
      }
    }
    
    if (!hasValidToken && captchaJWTToken) {
      try {
        jwt.verify(captchaJWTToken, JWT_SECRET);
        hasValidToken = true;
      } catch (error) {
        // Token invalid
      }
    }

    // If no valid tokens found, return unauthorized
    if (!hasValidToken) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ message: 'Cookies cleared' });

    // Set cookies with an expired date to remove them
    response.cookies.set('captchaJWTToken', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
    });
    response.cookies.set('totpJWTToken', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
    });
    response.cookies.set('emailJWTToken', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Helper function to extract cookie value
function extractCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName) {
      return value;
    }
  }
  return null;
}

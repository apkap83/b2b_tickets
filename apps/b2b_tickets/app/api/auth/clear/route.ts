// app/api/clearCookies/route.js
import { NextResponse } from 'next/server';

export async function POST() {
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
}

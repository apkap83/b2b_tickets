import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { v4 as uuidv4 } from 'uuid';
import { AppRoleTypes } from '@b2b-tickets/shared-models';

// Helper function to get client IP
function getClientIp(req) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',').shift() ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    '0.0.0.0';
  return ip;
}

// Middleware for logging IP and URL
function logIpMiddleware(req) {
  const requestHeaders = new Headers(req.headers);
  const clientIp = getClientIp(req);
  const sessionId = uuidv4();

  requestHeaders.set('request-ip', clientIp);
  requestHeaders.set('session-id', sessionId);
  requestHeaders.set('request-url', req.url);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Middleware for authorization
const authMiddleware = withAuth(
  function middleware(req) {
    const pathName = req.nextUrl.pathname;

    // Log token and roles for debugging
    const roles = req.nextauth?.token?.roles || [];
    const permissions = req.nextauth?.token?.permissions || [];

    // If no roles, redirect to sign-in
    if (!roles.length) {
      console.warn('[Auth Middleware] No roles found, redirecting to sign-in');
      return NextResponse.rewrite(new URL('/signin', req.url));
    }

    // Allow admins
    if (roles.includes(AppRoleTypes.Admin)) {
      return NextResponse.next();
    }

    // Check if user has permission to access requested path
    const authorized = permissions.some((permission) =>
      pathName.startsWith(permission.permissionEndPoint)
    );

    if (!authorized) {
      console.warn(`[Auth Middleware] Access denied for path: ${pathName}`);
      return NextResponse.rewrite(new URL('/denied', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        if (!token) {
          console.warn('[Auth Middleware] Unauthorized: No valid token');
          return false;
        }

        return token.roles && token.roles.length > 0;
      },
    },
  }
);

// Combined Middleware
export async function middleware(req) {
  // First, execute the IP logging middleware
  const ipResponse = logIpMiddleware(req);
  const requestForAuth = ipResponse?.request || req;

  // Execute the authorization middleware only for specific paths
  if (
    ['/tickets', '/ticket', '/admin'].some((path) =>
      req.nextUrl.pathname.startsWith(path)
    )
  ) {
    return authMiddleware(requestForAuth);
  }

  // For all other paths, return the response from the IP logging middleware
  return ipResponse;
}

// Config for applying middleware
export const config = {
  matcher: ['/:path*'],
};

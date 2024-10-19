import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { v4 as uuidv4 } from 'uuid';
import { AppRoleTypes } from '@b2b-tickets/shared-models';
// import { logAuth, logInfo } from '@b2b-tickets/logging';

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

  // Generate a session ID (UUID) for each request
  const sessionId = uuidv4();

  // Add new request headers
  requestHeaders.set('request-ip', clientIp);
  requestHeaders.set('request-url', req.url);
  requestHeaders.set('session-id', sessionId);
  // Log IP and URL
  //   console.log('*** IP MIDDLEWARE IS NOW EXECUTED');
  //   console.log('*** Request IP:', clientIp);
  //   console.log('*** Request URL:', req.url);

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

    // Safely extract roles and permissions from the token
    const roles = req.nextauth?.token?.roles || [];
    const permissions = req.nextauth?.token?.permissions || [];

    console.log('*** AUTH MIDDLEWARE IS NOW EXECUTED');
    console.log('*** pathName:', pathName);
    console.log('*** roles:', roles);
    console.log('*** permissions:', permissions);

    // If no roles are present, redirect to the sign-in page
    if (!roles.length) {
      console.warn('No roles found, redirecting to sign-in');
      return NextResponse.rewrite(new URL('/signin', req.url));
    }

    // Allow Admins to proceed directly
    if (roles.includes(AppRoleTypes.Admin)) {
      console.log('Admin access granted');
      return NextResponse.next();
    }
    // Check if the user has permission to access the requested path
    const authorized = permissions.some((permission) => {
      const permissionEndPoint = permission.permissionEndPoint;
      return permissionEndPoint && pathName.startsWith(permissionEndPoint);
    });

    // If not authorized, redirect to the access denied page
    if (!authorized) {
      console.warn(`Access denied for path: ${pathName}`);
      return NextResponse.rewrite(new URL('/denied', req.url));
    }

    // Proceed to the next middleware or route
    console.log(`Access granted for path: ${pathName}`);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Ensure token is present and contains roles
        if (!token || !token.roles) {
          console.warn('Unauthorized: No valid token or roles');
          return false;
        }
        return true;
      },
    },
  }
);

// Combined Middleware
export async function middleware(req) {
  // First, execute the IP logging middleware
  const ipResponse = logIpMiddleware(req);

  // Pass the modified request to the authorization middleware if needed
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

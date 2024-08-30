import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
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

  // Add new request headers
  requestHeaders.set('request-ip', clientIp);
  requestHeaders.set('request-url', req.url);

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
    const roles = req.nextauth.token.roles;
    const permissions = req.nextauth.token.permissions;

    console.log('*** AUTH MIDDLEWARE IS NOW EXECUTED');
    console.log('*** pathName:', pathName);
    console.log('*** roles:', roles);
    console.log('*** permissions:', permissions);

    if (!roles) {
      return NextResponse.rewrite(new URL('/signin', req.url));
    }

    if (roles.includes(AppRoleTypes.Admin)) {
      return NextResponse.next();
    }

    const authorized = permissions.some((permission) =>
      pathName.startsWith(permission.permissionEndPoint)
    );

    if (!authorized) {
      return NextResponse.rewrite(new URL('/denied', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Combined Middleware
export async function middleware(req) {
  // First, execute the IP logging middleware
  const ipResponse = logIpMiddleware(req);

  // // Log Page Visits
  // const headersList = req.headers;
  // const reqIP = headersList.get('request-ip');
  // const reqURL = headersList.get('request-url');

  // const logMessage = {
  //   reqIP,
  //   reqURL,
  //   message: 'Page accessed',
  // };

  // // Make sure to use an absolute URL for fetch
  // const apiURL = `${process.env.NEXTAUTH_URL}/api/log`;

  // await fetch(apiURL, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(logMessage),
  // });

  // Pass the modified request to the authorization middleware if needed
  const requestForAuth = ipResponse?.request || req;

  // Execute the authorization middleware only for specific paths
  if (
    ['/ClientMember', '/Member', '/tickets', '/admin'].some((path) =>
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
  matcher: [
    '/:path*', // Ensure IP logging applies to all paths
  ],
};

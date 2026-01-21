import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/config/constants';

/**
 * Decode JWT payload without verification (edge runtime compatible)
 * Returns null if token is invalid or expired
 */
function decodeAndValidateToken(token: string): { isValid: boolean; isExpired: boolean } {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false, isExpired: false };
    }

    // Decode payload (base64url)
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const decoded = JSON.parse(jsonPayload);

    // Check expiration
    if (decoded.exp) {
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      // Token is expired if current time is past expiration
      // Add 30 second buffer to handle clock skew
      if (currentTime > expirationTime + 30000) {
        return { isValid: true, isExpired: true };
      }
    }

    return { isValid: true, isExpired: false };
  } catch {
    // Invalid token format
    return { isValid: false, isExpired: false };
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Protected routes that require authentication
  const isProtectedRoute =
    pathname.startsWith('/chat') ||
    pathname.startsWith('/chats') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/admin');

  // Validate token if present
  const tokenValidation = token ? decodeAndValidateToken(token) : { isValid: false, isExpired: false };

  // Redirect to login if accessing protected route without valid token
  if (isProtectedRoute && (!token || !tokenValidation.isValid || tokenValidation.isExpired)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);

    // If token was expired, add a query param to show appropriate message
    if (tokenValidation.isExpired) {
      loginUrl.searchParams.set('expired', 'true');
    }

    // Clear the invalid/expired token cookie
    const response = NextResponse.redirect(loginUrl);
    if (token && (!tokenValidation.isValid || tokenValidation.isExpired)) {
      response.cookies.delete(COOKIE_NAME);
      response.cookies.delete(REFRESH_COOKIE_NAME);
    }

    return response;
  }

  // Redirect to chat if accessing login with valid, non-expired token
  if (pathname === '/login' && token && tokenValidation.isValid && !tokenValidation.isExpired) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

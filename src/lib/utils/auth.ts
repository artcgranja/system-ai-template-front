import { STORAGE_KEYS } from '@/config/constants';

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Clear all auth data from localStorage
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

/**
 * Parse JWT token to get expiry
 */
export function parseJwt(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const parsed = parseJwt(token);
  if (!parsed || !parsed.exp) return true;

  const now = Date.now() / 1000;
  return parsed.exp < now;
}

/**
 * Check if JWT token will expire soon (within specified minutes)
 * @param token - JWT token to check
 * @param minutesBeforeExpiry - Number of minutes before expiration (default: 5)
 */
export function isTokenExpiringSoon(token: string, minutesBeforeExpiry: number = 5): boolean {
  const parsed = parseJwt(token);
  if (!parsed || !parsed.exp) return true;

  const now = Date.now() / 1000;
  const bufferTime = minutesBeforeExpiry * 60; // Convert minutes to seconds
  return parsed.exp < (now + bufferTime);
}

/**
 * Set authentication cookie (client-side)
 * This is needed for Next.js middleware to access the token
 */
export function setAuthCookie(token: string): void {
  if (typeof window === 'undefined') return;

  // Calculate expiry (30 days from now)
  const expiryDays = 30;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  // Set cookie with security flags
  document.cookie = `vora_access_token=${token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Remove authentication cookie (client-side)
 */
export function removeAuthCookie(): void {
  if (typeof window === 'undefined') return;

  // Set cookie with past expiry to delete it
  document.cookie = 'vora_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

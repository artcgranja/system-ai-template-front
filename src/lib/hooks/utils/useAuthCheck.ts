/**
 * Authentication Check Hook
 * Uses Zustand store for reactive auth state
 */

import { useAuthStore } from '@/lib/stores/authStore';

/**
 * Check if user is authenticated using Zustand store
 * Reactively updates when auth state changes (login/logout)
 *
 * @returns true if user is authenticated, false otherwise
 *
 * @example
 * const isAuthenticated = useAuthCheck();
 *
 * useQuery({
 *   queryKey: ['data'],
 *   queryFn: fetchData,
 *   enabled: isAuthenticated,
 * });
 */
export function useAuthCheck(): boolean {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated;
}

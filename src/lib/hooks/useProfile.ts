/**
 * Profile Hook
 * Manages user's profile with department and role information
 */

import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api/user';
import { useAuthCheck } from './utils/useAuthCheck';
import { QUERY_KEYS, DEFAULT_QUERY_CONFIG } from './config/queryConfig';
import type { UserProfile, Department, Role } from '@/types/rbac';

export function useProfile() {
  const isAuthenticated = useAuthCheck();

  // Fetch user profile
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<UserProfile>({
    queryKey: QUERY_KEYS.userProfile,
    queryFn: userApi.getProfile,
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
    staleTime: 300000, // Profile data is stable, cache for 5 minutes
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
    // Convenience getters
    fullName: profile?.fullName ?? '',
    employeeId: profile?.employeeId ?? '',
    department: profile?.department,
    role: profile?.role,
    isActive: profile?.isActive ?? false,
    isOnboarded: !!profile?.onboardedAt,
  };
}

/**
 * Hook for fetching department options (for dropdowns)
 */
export function useDepartmentOptions() {
  const isAuthenticated = useAuthCheck();

  const {
    data: departments,
    isLoading,
    error,
    refetch,
  } = useQuery<Department[]>({
    queryKey: ['departmentOptions'],
    queryFn: userApi.getDepartmentOptions,
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
    staleTime: 600000, // Cache for 10 minutes
  });

  return {
    departments: departments ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching role options (for dropdowns)
 */
export function useRoleOptions() {
  const isAuthenticated = useAuthCheck();

  const {
    data: roles,
    isLoading,
    error,
    refetch,
  } = useQuery<Role[]>({
    queryKey: ['roleOptions'],
    queryFn: userApi.getRoleOptions,
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
    staleTime: 600000, // Cache for 10 minutes
  });

  return {
    roles: roles ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * React Query Configuration
 * Shared configuration for all React Query hooks
 */

import { keepPreviousData, type UseQueryOptions } from '@tanstack/react-query';

/**
 * Default query configuration used across all resources
 * Ensures consistent behavior for caching, retries, and refetching
 */
export const DEFAULT_QUERY_CONFIG = {
  staleTime: 60000, // Data is fresh for 1 minute
  retry: 1, // Only retry once on failure
  refetchOnWindowFocus: false, // Don't refetch when window regains focus
  refetchOnMount: true, // Refetch when component mounts
  placeholderData: keepPreviousData, // Keep previous data while fetching new data
} as const;

/**
 * Create query configuration for authenticated resources
 * Automatically enables/disables query based on authentication status
 *
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Query configuration with authentication check
 */
export function createAuthenticatedQueryConfig<T>(
  isAuthenticated: boolean
): Partial<UseQueryOptions<T>> {
  return {
    ...DEFAULT_QUERY_CONFIG,
    enabled: isAuthenticated,
  };
}

/**
 * Query keys registry for consistent cache management
 * Centralizes all query keys to avoid typos and ensure consistency
 */
export const QUERY_KEYS = {
  folders: ['folders'] as const,
  conversations: ['conversations'] as const,
  conversation: (id: string) => ['conversations', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  currentUser: ['currentUser'] as const,

  // RBAC & Quota keys
  userProfile: ['userProfile'] as const,
  userPermissions: ['userPermissions'] as const,
  quotaStatus: ['quotaStatus'] as const,
  quotaStats: (period: string) => ['quotaStats', period] as const,
  quotaCheck: ['quotaCheck'] as const,
  alerts: ['alerts'] as const,

  // Admin keys
  adminDashboard: ['adminDashboard'] as const,
  adminQuotas: ['adminQuotas'] as const,
  adminUsers: ['adminUsers'] as const,
  adminDepartments: ['adminDepartments'] as const,
  adminRoles: ['adminRoles'] as const,
  adminAuditLogs: ['adminAuditLogs'] as const,

  // Admin Permission keys (NEW)
  adminPermissions: ['adminPermissions'] as const,
  adminPermissionsGrouped: ['adminPermissions', 'grouped'] as const,

  // Admin Analytics keys
  adminTokenUsageAnalytics: ['adminTokenUsageAnalytics'] as const,
  adminTokenUsageUserDetails: (userId: string) => ['adminTokenUsageUserDetails', userId] as const,
  adminTokenUsageDepartments: ['adminTokenUsageDepartments'] as const,
  adminUserDetailedAnalytics: (userId: string) => ['adminUserDetailedAnalytics', userId] as const,

  // Admin Feedback keys
  adminFeedbacks: (filters?: unknown) => ['adminFeedbacks', filters] as const,

  // Feedback keys
  feedbacks: (filters?: unknown) => ['feedbacks', filters] as const,
  feedback: (id: string) => ['feedback', id] as const,

  // Wiki keys
  wiki: ['wiki'] as const,
} as const;

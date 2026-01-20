/**
 * Admin Hooks
 * Manages admin dashboard, quota management, user management, and audit logs
 * Updated for new Permission entity-based API
 */

import { useCallback, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, QuotaListParams, UserListParams, AuditLogListParams } from '@/lib/api/admin';
import { useAuthCheck } from './utils/useAuthCheck';
import { QUERY_KEYS, DEFAULT_QUERY_CONFIG } from './config/queryConfig';
import type {
  AdminDashboard,
  AdminQuotasResponse,
  AdminUser,
  Department,
  Role,
  Permission,
  GroupedPermissions,
  AuditLogsResponse,
  UpdateQuotaPayload,
  OnboardUserPayload,
  CreateUserPayload,
  CreateUserResponse,
  CreateRolePayload,
  UpdateRolePayload,
} from '@/types/rbac';
import type { TokenUsageUserParams, UserDetailedAnalyticsResponse } from '@/types/analytics';
import type {
  Feedback,
  AdminFeedbackFilters,
  UpdateAdminFeedbackInput,
  FeedbackListResponse,
} from '@/types/feedback';

// =============================================================================
// Dashboard Hook
// =============================================================================

export function useAdminDashboard() {
  const isAuthenticated = useAuthCheck();

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery<AdminDashboard>({
    queryKey: QUERY_KEYS.adminDashboard,
    queryFn: adminApi.getDashboard,
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  return {
    dashboard,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================================
// Permissions Hook (NEW)
// =============================================================================

export function useAdminPermissions() {
  const isAuthenticated = useAuthCheck();

  // Fetch all permissions
  const {
    data: permissions,
    isLoading: isLoadingPermissions,
    error: permissionsError,
    refetch: refetchPermissions,
  } = useQuery<Permission[]>({
    queryKey: QUERY_KEYS.adminPermissions,
    queryFn: () => adminApi.getPermissions(),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  // Fetch grouped permissions (for role editing UI)
  const {
    data: groupedPermissions,
    isLoading: isLoadingGrouped,
    error: groupedError,
  } = useQuery<GroupedPermissions>({
    queryKey: QUERY_KEYS.adminPermissionsGrouped,
    queryFn: adminApi.getPermissionsGrouped,
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  return {
    permissions: permissions ?? [],
    groupedPermissions: groupedPermissions ?? {},
    isLoading: isLoadingPermissions || isLoadingGrouped,
    error: permissionsError || groupedError,
    refetch: refetchPermissions,
  };
}

// =============================================================================
// Quota Management Hook
// =============================================================================

export function useAdminQuotas(initialParams: QuotaListParams = {}) {
  const isAuthenticated = useAuthCheck();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<QuotaListParams>(initialParams);

  const {
    data: quotasData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<AdminQuotasResponse>({
    queryKey: [...QUERY_KEYS.adminQuotas, params],
    queryFn: () => adminApi.getQuotas(params),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  // Update quota mutation
  const updateQuotaMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateQuotaPayload }) =>
      adminApi.updateQuota(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminQuotas });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      // Error is propagated to the caller via mutateAsync rejection
      // Logging here for debugging purposes in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminQuotas] updateQuota error:', error.message);
      }
    },
  });

  // Suspend user mutation
  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminQuotas });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminQuotas] suspendUser error:', error.message);
      }
    },
  });

  // Unsuspend user mutation
  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminQuotas });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminQuotas] unsuspendUser error:', error.message);
      }
    },
  });

  const updateQuota = useCallback(
    async (userId: string, payload: UpdateQuotaPayload) => {
      return updateQuotaMutation.mutateAsync({ userId, payload });
    },
    [updateQuotaMutation]
  );

  const suspendUser = useCallback(
    async (userId: string, reason: string) => {
      return suspendMutation.mutateAsync({ userId, reason });
    },
    [suspendMutation]
  );

  const unsuspendUser = useCallback(
    async (userId: string) => {
      return unsuspendMutation.mutateAsync(userId);
    },
    [unsuspendMutation]
  );

  const updateParams = useCallback((newParams: Partial<QuotaListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  return {
    users: quotasData?.users ?? [],
    total: quotasData?.total ?? 0,
    totalSystemUsage: quotasData?.totalSystemUsage ?? 0,
    page: quotasData?.page ?? 1,
    pageSize: quotasData?.pageSize ?? 50,
    isLoading,
    isFetching,
    error,
    refetch,
    params,
    updateParams,
    // Mutations
    updateQuota,
    suspendUser,
    unsuspendUser,
    isUpdating: updateQuotaMutation.isPending,
    isSuspending: suspendMutation.isPending,
    isUnsuspending: unsuspendMutation.isPending,
  };
}

// =============================================================================
// User Management Hook
// =============================================================================

export function useAdminUsers(initialParams: UserListParams = {}) {
  const isAuthenticated = useAuthCheck();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<UserListParams>(initialParams);

  const {
    data: usersData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<{
    users: AdminUser[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: [...QUERY_KEYS.adminUsers, params],
    queryFn: () => adminApi.getUsers(params),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  // Onboard user mutation
  const onboardMutation = useMutation({
    mutationFn: (payload: OnboardUserPayload) => adminApi.onboardUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminUsers] onboardUser error:', error.message);
      }
    },
  });

  const onboardUser = useCallback(
    async (payload: OnboardUserPayload) => {
      return onboardMutation.mutateAsync(payload);
    },
    [onboardMutation]
  );

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => adminApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminUsers] createUser error:', error.message);
      }
    },
  });

  const createUser = useCallback(
    async (payload: CreateUserPayload): Promise<CreateUserResponse> => {
      return createUserMutation.mutateAsync(payload);
    },
    [createUserMutation]
  );

  const updateParams = useCallback((newParams: Partial<UserListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  return {
    users: usersData?.users ?? [],
    total: usersData?.total ?? 0,
    page: usersData?.page ?? 1,
    pageSize: usersData?.pageSize ?? 50,
    isLoading,
    isFetching,
    error,
    refetch,
    params,
    updateParams,
    // Mutations
    onboardUser,
    isOnboarding: onboardMutation.isPending,
    createUser,
    isCreatingUser: createUserMutation.isPending,
  };
}

// =============================================================================
// Department Management Hook
// =============================================================================

export function useAdminDepartments() {
  const isAuthenticated = useAuthCheck();
  const queryClient = useQueryClient();

  const {
    data: departments,
    isLoading,
    error,
    refetch,
  } = useQuery<Department[]>({
    queryKey: QUERY_KEYS.adminDepartments,
    queryFn: adminApi.getDepartments,
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  // Create department mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; parentDepartmentId?: string }) =>
      adminApi.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDepartments });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminDepartments] create error:', error.message);
      }
    },
  });

  // Update department mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string; parentDepartmentId?: string };
    }) => adminApi.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDepartments });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminDepartments] update error:', error.message);
      }
    },
  });

  // Delete department mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDepartments });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminDepartments] delete error:', error.message);
      }
    },
  });

  const createDepartment = useCallback(
    async (data: { name: string; description?: string; parentDepartmentId?: string }) => {
      return createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const updateDepartment = useCallback(
    async (
      id: string,
      data: { name?: string; description?: string; parentDepartmentId?: string }
    ) => {
      return updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  const deleteDepartment = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    departments: departments ?? [],
    isLoading,
    error,
    refetch,
    // Mutations
    createDepartment,
    updateDepartment,
    deleteDepartment,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// =============================================================================
// Role Management Hook (UPDATED for new permission IDs)
// =============================================================================

export function useAdminRoles() {
  const isAuthenticated = useAuthCheck();
  const queryClient = useQueryClient();

  const {
    data: roles,
    isLoading,
    error,
    refetch,
  } = useQuery<Role[]>({
    queryKey: QUERY_KEYS.adminRoles,
    queryFn: () => adminApi.getRoles(),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  // Create role mutation (uses permission IDs)
  const createMutation = useMutation({
    mutationFn: (data: CreateRolePayload) => adminApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRoles });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminRoles] create error:', error.message);
      }
    },
  });

  // Update role mutation (uses permission IDs)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRolePayload }) =>
      adminApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRoles });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminRoles] update error:', error.message);
      }
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRoles });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminRoles] delete error:', error.message);
      }
    },
  });

  const createRole = useCallback(
    async (data: CreateRolePayload) => {
      return createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const updateRole = useCallback(
    async (id: string, data: UpdateRolePayload) => {
      return updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  const deleteRole = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    roles: roles ?? [],
    isLoading,
    error,
    refetch,
    // Mutations
    createRole,
    updateRole,
    deleteRole,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// =============================================================================
// Audit Logs Hook
// =============================================================================

export function useAdminAuditLogs(initialParams: AuditLogListParams = {}) {
  const isAuthenticated = useAuthCheck();
  const [params, setParams] = useState<AuditLogListParams>(initialParams);

  const {
    data: logsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<AuditLogsResponse>({
    queryKey: [...QUERY_KEYS.adminAuditLogs, params],
    queryFn: () => adminApi.getAuditLogs(params),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  const updateParams = useCallback((newParams: Partial<AuditLogListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const resetParams = useCallback(() => {
    setParams({});
  }, []);

  return {
    logs: logsData?.logs ?? [],
    total: logsData?.total ?? 0,
    page: logsData?.page ?? 1,
    pageSize: logsData?.pageSize ?? 50,
    totalPages: logsData?.totalPages ?? 0,
    isLoading,
    isFetching,
    error,
    refetch,
    params,
    updateParams,
    resetParams,
  };
}

// =============================================================================
// Token Usage Analytics Hook
// =============================================================================

export interface TokenUsageAnalyticsHookParams {
  period?:
    | 'last_7_days'
    | 'last_14_days'
    | 'last_30_days'
    | 'last_60_days'
    | 'last_90_days'
    | 'last_180_days'
    | 'last_1_year'
    | 'last_2_years'
    | 'custom';
  startDate?: string;
  endDate?: string;
  departmentIds?: string[];
  userSearch?: string;
  targetUserId?: string;
  groupBy?: 'day' | 'week' | 'month';
  page?: number;
  pageSize?: number;
}

export function useTokenUsageAnalytics(initialParams: TokenUsageAnalyticsHookParams = {}) {
  const isAuthenticated = useAuthCheck();
  const [params, setParams] = useState<TokenUsageAnalyticsHookParams>(initialParams);

  // Always fetch with groupBy='day' and exclude groupBy from queryKey
  const apiParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { groupBy, ...restParams } = params;
    return { ...restParams, groupBy: 'day' as const };
  }, [params]);

  const queryKeyParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { groupBy, ...restParams } = params;
    return restParams;
  }, [params]);

  const {
    data: analyticsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEYS.adminTokenUsageAnalytics, queryKeyParams],
    queryFn: () => adminApi.getTokenUsageAnalytics(apiParams),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  const updateParams = useCallback((newParams: Partial<TokenUsageAnalyticsHookParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const resetParams = useCallback(() => {
    setParams({});
  }, []);

  return {
    analytics: analyticsData,
    summary: analyticsData?.summary,
    timeSeries: analyticsData?.timeSeries,
    modelBreakdown: analyticsData?.modelBreakdown ?? [],
    userBreakdown: analyticsData?.userBreakdown,
    departmentBreakdown: analyticsData?.departmentBreakdown ?? [],
    period: analyticsData?.period,
    periodStart: analyticsData?.periodStart,
    periodEnd: analyticsData?.periodEnd,
    isLoading,
    isFetching,
    error,
    refetch,
    params,
    updateParams,
    resetParams,
  };
}

// =============================================================================
// User Detailed Analytics Hook
// =============================================================================

export interface UserDetailedAnalyticsHookParams {
  period?:
    | 'last_7_days'
    | 'last_14_days'
    | 'last_30_days'
    | 'last_60_days'
    | 'last_90_days'
    | 'last_180_days'
    | 'last_1_year'
    | 'last_2_years'
    | 'custom';
  startDate?: string;
  endDate?: string;
}

/**
 * Hook for fetching detailed analytics for a specific user
 * Includes profile, quota status, usage analytics, weekly history, and activity stats
 */
export function useUserDetailedAnalytics(
  userId: string | null,
  initialParams: UserDetailedAnalyticsHookParams = {}
) {
  const isAuthenticated = useAuthCheck();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<UserDetailedAnalyticsHookParams>(initialParams);

  const apiParams: TokenUsageUserParams = useMemo(() => ({
    period: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  }), [params.period, params.startDate, params.endDate]);

  const {
    data: detailedAnalytics,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<UserDetailedAnalyticsResponse>({
    queryKey: [...QUERY_KEYS.adminUserDetailedAnalytics(userId ?? ''), apiParams],
    queryFn: () => {
      // Guard against null userId - this should never happen due to enabled condition
      // but provides type safety without non-null assertion
      if (!userId) {
        return Promise.reject(new Error('User ID is required'));
      }
      return adminApi.getUserDetailedAnalytics(userId, apiParams);
    },
    enabled: isAuthenticated && !!userId,
    ...DEFAULT_QUERY_CONFIG,
  });

  const updateParams = useCallback((newParams: Partial<UserDetailedAnalyticsHookParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const resetParams = useCallback(() => {
    setParams({});
  }, []);

  /**
   * Invalidate the detailed analytics cache for this user
   * Call this after updating quota or other user settings
   */
  const invalidateCache = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.adminUserDetailedAnalytics(userId) 
      });
    }
  }, [queryClient, userId]);

  return {
    // Data
    detailedAnalytics,
    userProfile: detailedAnalytics?.userProfile,
    currentQuotaStatus: detailedAnalytics?.currentQuotaStatus,
    quotaSettings: detailedAnalytics?.quotaSettings,
    usageAnalytics: detailedAnalytics?.usageAnalytics,
    weeklyHistory: detailedAnalytics?.weeklyHistory ?? [],
    activityStats: detailedAnalytics?.activityStats,
    generatedAt: detailedAnalytics?.generatedAt,
    // State
    isLoading,
    isFetching,
    error,
    refetch,
    // Params
    params,
    updateParams,
    resetParams,
    // Helpers
    invalidateCache,
  };
}

// =============================================================================
// Feedback Management Hook
// =============================================================================

export function useAdminFeedbacks(initialParams: AdminFeedbackFilters = {}) {
  const isAuthenticated = useAuthCheck();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<AdminFeedbackFilters>(initialParams);

  const {
    data: feedbacksData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<FeedbackListResponse>({
    queryKey: QUERY_KEYS.adminFeedbacks(params),
    queryFn: () => adminApi.getFeedbacks(params),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  // Update feedback mutation
  const updateMutation = useMutation({
    mutationFn: ({ feedbackId, data }: { feedbackId: string; data: UpdateAdminFeedbackInput }) =>
      adminApi.updateFeedback(feedbackId, data),
    onSuccess: () => {
      // Invalidate feedbacks list to refresh
      queryClient.invalidateQueries({ queryKey: ['adminFeedbacks'] });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAdminFeedbacks] updateFeedback error:', error.message);
      }
    },
  });

  const updateFeedback = useCallback(
    async (feedbackId: string, data: UpdateAdminFeedbackInput): Promise<Feedback> => {
      return updateMutation.mutateAsync({ feedbackId, data });
    },
    [updateMutation]
  );

  const updateParams = useCallback((newParams: Partial<AdminFeedbackFilters>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const resetParams = useCallback(() => {
    setParams({});
  }, []);

  return {
    feedbacks: feedbacksData?.items ?? [],
    total: feedbacksData?.total ?? 0,
    page: feedbacksData?.page ?? 1,
    pageSize: feedbacksData?.page_size ?? 20,
    totalPages: feedbacksData?.total_pages ?? 1,
    isLoading,
    isFetching,
    error,
    refetch,
    params,
    updateParams,
    resetParams,
    // Mutations
    updateFeedback,
    isUpdating: updateMutation.isPending,
  };
}

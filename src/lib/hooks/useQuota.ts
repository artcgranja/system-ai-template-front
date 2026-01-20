/**
 * Quota Hook
 * Manages user's token quota status and statistics
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/user';
import { useAuthCheck } from './utils/useAuthCheck';
import { QUERY_KEYS, DEFAULT_QUERY_CONFIG } from './config/queryConfig';
import type { QuotaStatus, QuotaStats, QuotaCheckResult, QuotaPeriod } from '@/types/rbac';

/**
 * Result type for quota check operations
 * Provides explicit success/error states instead of ambiguous null
 */
export interface QuotaCheckResponse {
  success: boolean;
  data: QuotaCheckResult | null;
  error: string | null;
}

export function useQuota() {
  const isAuthenticated = useAuthCheck();
  const queryClient = useQueryClient();

  // Fetch quota status
  const {
    data: quota,
    isLoading: isLoadingQuota,
    error: quotaError,
    refetch: refetchQuota,
  } = useQuery<QuotaStatus>({
    queryKey: QUERY_KEYS.quotaStatus,
    queryFn: userApi.getQuotaStatus,
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
    staleTime: 30000, // Refresh quota more frequently (30 seconds)
  });

  /**
   * Check quota before sending message
   * Returns typed response with explicit success/error states
   */
  const checkQuota = useCallback(
    async (estimatedTokens?: number): Promise<QuotaCheckResponse> => {
      if (!isAuthenticated) {
        return {
          success: false,
          data: null,
          error: 'Usuario nao autenticado',
        };
      }

      try {
        const result = await userApi.checkQuota(estimatedTokens);
        return {
          success: true,
          data: result,
          error: null,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erro ao verificar cota. Tente novamente.';

        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    },
    [isAuthenticated]
  );

  // Invalidate quota cache (call after sending message)
  const invalidateQuota = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotaStatus });
  }, [queryClient]);

  // Helper to get quota color based on percentage
  const getQuotaColor = useCallback((percentage: number): 'green' | 'yellow' | 'red' => {
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  }, []);

  // Helper to format token numbers
  const formatTokens = useCallback((tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }, []);

  return {
    quota,
    isLoading: isLoadingQuota,
    error: quotaError,
    refetch: refetchQuota,
    checkQuota,
    invalidateQuota,
    getQuotaColor,
    formatTokens,
    // Computed values
    isNearLimit: quota ? quota.percentageUsed >= 80 : false,
    isExceeded: quota ? quota.percentageUsed >= 100 : false,
    isSuspended: quota?.isSuspended ?? false,
    isUnlimited: quota?.isUnlimited ?? false,
  };
}

/**
 * Hook for detailed quota statistics
 */
export function useQuotaStats(period: QuotaPeriod = 'week') {
  const isAuthenticated = useAuthCheck();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery<QuotaStats>({
    queryKey: QUERY_KEYS.quotaStats(period),
    queryFn: () => userApi.getQuotaStats(period),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

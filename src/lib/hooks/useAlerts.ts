/**
 * Alerts Hook
 * Manages user's quota alerts and notifications
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/user';
import { useAuthCheck } from './utils/useAuthCheck';
import { QUERY_KEYS, DEFAULT_QUERY_CONFIG } from './config/queryConfig';
import type { AlertsResponse, QuotaAlert, AlertType } from '@/types/rbac';

export function useAlerts() {
  const isAuthenticated = useAuthCheck();
  const queryClient = useQueryClient();

  // Fetch all alerts
  const {
    data: alertsData,
    isLoading,
    error,
    refetch,
  } = useQuery<AlertsResponse>({
    queryKey: QUERY_KEYS.alerts,
    queryFn: () => userApi.getAlerts(false),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
    staleTime: 60000, // Refresh alerts every minute
    refetchInterval: 60000, // Auto-refetch every minute
  });

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => userApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      // Invalidate alerts cache to refresh the list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alerts });
    },
    onError: (error: Error) => {
      // Error is propagated to the caller via mutateAsync rejection
      // Logged only in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAlerts] Error acknowledging alert:', error.message);
      }
    },
  });

  // Acknowledge a single alert
  const acknowledge = useCallback(
    async (alertId: string) => {
      return acknowledgeMutation.mutateAsync(alertId);
    },
    [acknowledgeMutation]
  );

  // Acknowledge all unread alerts with proper error handling
  const acknowledgeAll = useCallback(async (): Promise<{ success: boolean; failedCount: number }> => {
    if (!alertsData?.alerts) {
      return { success: true, failedCount: 0 };
    }

    const unacknowledged = alertsData.alerts.filter((a) => !a.acknowledgedAt);

    if (unacknowledged.length === 0) {
      return { success: true, failedCount: 0 };
    }

    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled(
      unacknowledged.map((a) => acknowledge(a.id))
    );

    const failedCount = results.filter((r) => r.status === 'rejected').length;

    // Invalidate cache to refresh the list regardless of partial failures
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alerts });

    return {
      success: failedCount === 0,
      failedCount,
    };
  }, [alertsData, acknowledge, queryClient]);

  // Get alert severity level
  const getAlertSeverity = useCallback(
    (alertType: AlertType): 'info' | 'warning' | 'error' => {
      switch (alertType) {
        case 'warning_50':
          return 'info';
        case 'warning_80':
          return 'warning';
        case 'warning_90':
        case 'exceeded':
        case 'suspended':
          return 'error';
        default:
          return 'info';
      }
    },
    []
  );

  // Get alert message
  const getAlertMessage = useCallback((alert: QuotaAlert): string => {
    switch (alert.alertType) {
      case 'warning_50':
        return `Você usou 50% da sua cota semanal de tokens.`;
      case 'warning_80':
        return `Atenção: Você usou 80% da sua cota semanal.`;
      case 'warning_90':
        return `Alerta: Você usou 90% da sua cota semanal!`;
      case 'exceeded':
        return `Sua cota semanal foi excedida.`;
      case 'suspended':
        return `Sua conta está suspensa.`;
      default:
        return `Alerta de cota: ${alert.thresholdPercent}%`;
    }
  }, []);

  return {
    alerts: alertsData?.alerts ?? [],
    total: alertsData?.total ?? 0,
    unreadCount: alertsData?.unacknowledgedCount ?? 0,
    isLoading,
    error,
    refetch,
    acknowledge,
    acknowledgeAll,
    isAcknowledging: acknowledgeMutation.isPending,
    // Helpers
    getAlertSeverity,
    getAlertMessage,
    // Computed
    hasUnreadAlerts: (alertsData?.unacknowledgedCount ?? 0) > 0,
  };
}

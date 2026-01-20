/**
 * User API Module - Sprint 3 RBAC & Quota
 * Handles user profile, permissions, quota, and alerts endpoints
 * Updated for new Permission entity-based API
 */

import apiClient, { handleApiResponse } from './client';
import {
  BackendUserProfile,
  BackendUserPermissions,
  BackendQuotaStatus,
  BackendQuotaStats,
  BackendQuotaCheckResult,
  BackendAlertsResponse,
  BackendDepartment,
  BackendRole,
  UserProfile,
  UserPermissions,
  QuotaStatus,
  QuotaStats,
  QuotaCheckResult,
  AlertsResponse,
  Department,
  Role,
  QuotaPeriod,
  transformUserProfile,
  transformUserPermissions,
  transformQuotaStatus,
  transformQuotaStats,
  transformQuotaCheckResult,
  transformAlertsResponse,
  transformDepartment,
  transformRole,
} from '@/types/rbac';

const USER_ENDPOINTS = {
  profile: '/api/user/me/profile',
  permissions: '/api/user/me/permissions',
  quota: '/api/user/me/quota',
  quotaStats: '/api/user/me/quota/stats',
  quotaCheck: '/api/user/me/quota/check',
  alerts: '/api/user/me/alerts',
  acknowledgeAlert: (alertId: string) => `/api/user/me/alerts/${alertId}/acknowledge`,
  departments: '/api/user/options/departments',
  roles: '/api/user/options/roles',
};

// =============================================================================
// Profile Endpoints
// =============================================================================

/**
 * Get current user's profile with department and role
 */
export async function getUserProfile(): Promise<UserProfile> {
  const response = await handleApiResponse<BackendUserProfile>(
    apiClient.get(USER_ENDPOINTS.profile)
  );
  return transformUserProfile(response);
}

/**
 * Get current user's permissions
 */
export async function getUserPermissions(): Promise<UserPermissions> {
  const response = await handleApiResponse<BackendUserPermissions>(
    apiClient.get(USER_ENDPOINTS.permissions)
  );
  return transformUserPermissions(response);
}

// =============================================================================
// Quota Endpoints
// =============================================================================

/**
 * Get current user's quota status
 */
export async function getQuotaStatus(): Promise<QuotaStatus> {
  const response = await handleApiResponse<BackendQuotaStatus>(
    apiClient.get(USER_ENDPOINTS.quota)
  );
  return transformQuotaStatus(response);
}

/**
 * Get detailed quota statistics for a period
 */
export async function getQuotaStats(period: QuotaPeriod = 'week'): Promise<QuotaStats> {
  const response = await handleApiResponse<BackendQuotaStats>(
    apiClient.get(USER_ENDPOINTS.quotaStats, { params: { period } })
  );
  return transformQuotaStats(response);
}

/**
 * Check if user can send a message with estimated tokens
 * Call this BEFORE sending a message
 */
export async function checkQuota(estimatedTokens?: number): Promise<QuotaCheckResult> {
  const params = estimatedTokens ? { estimated_tokens: estimatedTokens } : {};
  const response = await handleApiResponse<BackendQuotaCheckResult>(
    apiClient.get(USER_ENDPOINTS.quotaCheck, { params })
  );
  return transformQuotaCheckResult(response);
}

// =============================================================================
// Alert Endpoints
// =============================================================================

/**
 * Get user's quota alerts
 */
export async function getAlerts(unacknowledgedOnly: boolean = false): Promise<AlertsResponse> {
  const response = await handleApiResponse<BackendAlertsResponse>(
    apiClient.get(USER_ENDPOINTS.alerts, {
      params: { unacknowledged_only: unacknowledgedOnly },
    })
  );
  return transformAlertsResponse(response);
}

/**
 * Acknowledge (mark as read) a specific alert
 */
export async function acknowledgeAlert(alertId: string): Promise<{ message: string; alertId: string }> {
  const response = await handleApiResponse<{ message: string; alert_id: string }>(
    apiClient.post(USER_ENDPOINTS.acknowledgeAlert(alertId))
  );
  return {
    message: response.message,
    alertId: response.alert_id,
  };
}

// =============================================================================
// Options Endpoints (for dropdowns)
// =============================================================================

/**
 * Get list of departments for dropdown selection
 */
export async function getDepartmentOptions(): Promise<Department[]> {
  const response = await handleApiResponse<BackendDepartment[]>(
    apiClient.get(USER_ENDPOINTS.departments)
  );
  return response.map(transformDepartment);
}

/**
 * Get list of roles for dropdown selection
 */
export async function getRoleOptions(): Promise<Role[]> {
  const response = await handleApiResponse<BackendRole[]>(
    apiClient.get(USER_ENDPOINTS.roles)
  );
  return response.map(transformRole);
}

// =============================================================================
// Exports
// =============================================================================

export const userApi = {
  // Profile
  getProfile: getUserProfile,
  getPermissions: getUserPermissions,

  // Quota
  getQuotaStatus,
  getQuotaStats,
  checkQuota,

  // Alerts
  getAlerts,
  acknowledgeAlert,

  // Options
  getDepartmentOptions,
  getRoleOptions,
};

export default userApi;

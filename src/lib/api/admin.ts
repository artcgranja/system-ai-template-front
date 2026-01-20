/**
 * Admin API Module - Sprint 3 RBAC & Quota
 * Handles admin dashboard, user management, quota management, and audit logs
 * Updated for new Permission entity-based API
 */

import apiClient, { handleApiResponse } from './client';
import {
  BackendAdminDashboard,
  BackendAdminQuotasResponse,
  BackendAdminUser,
  BackendDepartment,
  BackendRole,
  BackendAuditLogsResponse,
  BackendPermission,
  BackendGroupedPermissions,
  BackendCreateUserResponse,
  AdminDashboard,
  AdminQuotasResponse,
  AdminUser,
  Department,
  Role,
  Permission,
  GroupedPermissions,
  AuditLogsResponse,
  AuditLogsFilters,
  UpdateQuotaPayload,
  OnboardUserPayload,
  CreateUserPayload,
  CreateUserResponse,
  CreateRolePayload,
  UpdateRolePayload,
  PermissionCategory,
  transformAdminDashboard,
  transformAdminQuotasResponse,
  transformAdminUser,
  transformDepartment,
  transformRole,
  transformPermission,
  transformGroupedPermissions,
  transformAuditLogsResponse,
  transformCreateUserResponse,
  toBackendUpdateQuotaPayload,
  toBackendOnboardUserPayload,
  toBackendCreateUserPayload,
  toBackendCreateRolePayload,
  toBackendUpdateRolePayload,
} from '@/types/rbac';
import {
  TokenUsageAnalyticsParams,
  TokenUsageUserParams,
  TokenUsageDepartmentsParams,
  TokenUsageAnalytics,
  TokenUsageUserDetails,
  TokenUsageDepartments,
  UserDetailedAnalyticsResponse,
  BackendTokenUsageAnalytics,
  BackendTokenUsageUserDetails,
  BackendTokenUsageDepartments,
  BackendUserDetailedAnalyticsResponse,
  transformTokenUsageAnalytics,
  transformTokenUsageUserDetails,
  transformTokenUsageDepartments,
  transformUserDetailedAnalytics,
} from '@/types/analytics';
import type {
  Feedback,
  AdminFeedbackFilters,
  UpdateAdminFeedbackInput,
  FeedbackListResponse,
} from '@/types/feedback';

const ADMIN_ENDPOINTS = {
  // Dashboard
  dashboard: '/api/admin/dashboard',

  // Permissions (NEW)
  permissions: '/api/admin/permissions',
  permissionsGrouped: '/api/admin/permissions/grouped',

  // Quotas
  quotas: '/api/admin/quotas',
  updateQuota: (userId: string) => `/api/admin/quotas/${userId}`,
  suspendUser: (userId: string) => `/api/admin/quotas/${userId}/suspend`,
  unsuspendUser: (userId: string) => `/api/admin/quotas/${userId}/unsuspend`,

  // Users
  users: '/api/admin/users',
  onboardUser: '/api/admin/users/onboard',

  // Departments
  departments: '/api/admin/departments',
  department: (id: string) => `/api/admin/departments/${id}`,

  // Roles
  roles: '/api/admin/roles',
  role: (id: string) => `/api/admin/roles/${id}`,

  // Audit Logs
  auditLogs: '/api/admin/audit-logs',

  // Analytics
  tokenUsageAnalytics: '/api/admin/analytics/token-usage',
  tokenUsageUserDetails: (userId: string) => `/api/admin/analytics/token-usage/users/${userId}`,
  tokenUsageDepartments: '/api/admin/analytics/token-usage/departments',
  userDetailedAnalytics: (userId: string) => `/api/admin/analytics/users/${userId}/detailed`,

  // Feedback
  feedback: '/api/admin/feedback',
  feedbackById: (id: string) => `/api/admin/feedback/${id}`,
};

// =============================================================================
// Dashboard Endpoints
// =============================================================================

/**
 * Get admin dashboard summary
 */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const response = await handleApiResponse<BackendAdminDashboard>(
    apiClient.get(ADMIN_ENDPOINTS.dashboard)
  );
  return transformAdminDashboard(response);
}

// =============================================================================
// Permission Endpoints (NEW)
// =============================================================================

export interface PermissionListParams {
  category?: PermissionCategory;
}

/**
 * Get all permissions (optionally filtered by category)
 */
export async function getPermissions(params: PermissionListParams = {}): Promise<Permission[]> {
  const queryParams: Record<string, string> = {};
  if (params.category) queryParams.category = params.category;

  const response = await handleApiResponse<{ permissions: BackendPermission[]; total: number }>(
    apiClient.get(ADMIN_ENDPOINTS.permissions, { params: queryParams })
  );
  return response.permissions.map(transformPermission);
}

/**
 * Get permissions grouped by category (for role editing UI)
 */
export async function getPermissionsGrouped(): Promise<GroupedPermissions> {
  const response = await handleApiResponse<BackendGroupedPermissions>(
    apiClient.get(ADMIN_ENDPOINTS.permissionsGrouped)
  );
  return transformGroupedPermissions(response);
}

// =============================================================================
// Quota Management Endpoints
// =============================================================================

export interface QuotaListParams {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  sortBy?: 'percentage_used' | 'current_usage' | 'full_name';
  sortDesc?: boolean;
}

/**
 * Get all users' quotas (paginated)
 */
export async function getAdminQuotas(params: QuotaListParams = {}): Promise<AdminQuotasResponse> {
  const queryParams: Record<string, string | number | boolean> = {};

  if (params.page !== undefined) queryParams.page = params.page;
  if (params.pageSize !== undefined) queryParams.page_size = params.pageSize;
  if (params.departmentId) queryParams.department_id = params.departmentId;
  if (params.sortBy) queryParams.sort_by = params.sortBy;
  if (params.sortDesc !== undefined) queryParams.sort_desc = params.sortDesc;

  const response = await handleApiResponse<BackendAdminQuotasResponse>(
    apiClient.get(ADMIN_ENDPOINTS.quotas, { params: queryParams })
  );
  return transformAdminQuotasResponse(response);
}

/**
 * Update a user's quota settings
 */
export async function updateUserQuota(userId: string, payload: UpdateQuotaPayload): Promise<void> {
  await apiClient.patch(
    ADMIN_ENDPOINTS.updateQuota(userId),
    toBackendUpdateQuotaPayload(payload)
  );
}

/**
 * Suspend a user
 */
export async function suspendUser(userId: string, reason: string): Promise<{ message: string }> {
  const response = await handleApiResponse<{ message: string }>(
    apiClient.post(ADMIN_ENDPOINTS.suspendUser(userId), null, {
      params: { reason },
    })
  );
  return response;
}

/**
 * Unsuspend a user
 */
export async function unsuspendUser(userId: string): Promise<{ message: string }> {
  const response = await handleApiResponse<{ message: string }>(
    apiClient.post(ADMIN_ENDPOINTS.unsuspendUser(userId))
  );
  return response;
}

// =============================================================================
// User Management Endpoints
// =============================================================================

export interface UserListParams {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  roleId?: string;
  includeInactive?: boolean;
}

/**
 * Get all users with profiles (paginated)
 */
export async function getAdminUsers(params: UserListParams = {}): Promise<{
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const queryParams: Record<string, string | number | boolean> = {};

  if (params.page !== undefined) queryParams.page = params.page;
  if (params.pageSize !== undefined) queryParams.page_size = params.pageSize;
  if (params.departmentId) queryParams.department_id = params.departmentId;
  if (params.roleId) queryParams.role_id = params.roleId;
  if (params.includeInactive !== undefined) queryParams.include_inactive = params.includeInactive;

  const response = await handleApiResponse<{
    users: BackendAdminUser[];
    total: number;
    page: number;
    page_size: number;
  }>(apiClient.get(ADMIN_ENDPOINTS.users, { params: queryParams }));

  return {
    users: response.users.map(transformAdminUser),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
  };
}

/**
 * Onboard a new user (assign role and department)
 */
export async function onboardUser(payload: OnboardUserPayload): Promise<{ message: string; userId: string }> {
  const response = await handleApiResponse<{ message: string; user_id: string }>(
    apiClient.post(ADMIN_ENDPOINTS.onboardUser, toBackendOnboardUserPayload(payload))
  );
  return {
    message: response.message,
    userId: response.user_id,
  };
}

/**
 * Create a new user with authentication, profile, and token quota
 */
export async function createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
  const response = await handleApiResponse<BackendCreateUserResponse>(
    apiClient.post(ADMIN_ENDPOINTS.users, toBackendCreateUserPayload(payload))
  );
  return transformCreateUserResponse(response);
}

// =============================================================================
// Department Management Endpoints
// =============================================================================

/**
 * Get all departments
 */
export async function getDepartments(): Promise<Department[]> {
  const response = await handleApiResponse<BackendDepartment[]>(
    apiClient.get(ADMIN_ENDPOINTS.departments)
  );
  return response.map(transformDepartment);
}

/**
 * Create a new department
 */
export async function createDepartment(data: {
  name: string;
  description?: string;
  parentDepartmentId?: string;
}): Promise<Department> {
  const response = await handleApiResponse<BackendDepartment>(
    apiClient.post(ADMIN_ENDPOINTS.departments, {
      name: data.name,
      description: data.description,
      parent_department_id: data.parentDepartmentId,
    })
  );
  return transformDepartment(response);
}

/**
 * Update a department
 */
export async function updateDepartment(
  id: string,
  data: {
    name?: string;
    description?: string;
    parentDepartmentId?: string;
  }
): Promise<Department> {
  const response = await handleApiResponse<BackendDepartment>(
    apiClient.patch(ADMIN_ENDPOINTS.department(id), {
      name: data.name,
      description: data.description,
      parent_department_id: data.parentDepartmentId,
    })
  );
  return transformDepartment(response);
}

/**
 * Delete a department
 */
export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(ADMIN_ENDPOINTS.department(id));
}

// =============================================================================
// Role Management Endpoints
// =============================================================================

export interface RoleListParams {
  includeInactive?: boolean;
}

/**
 * Get all roles with their permissions
 */
export async function getRoles(params: RoleListParams = {}): Promise<Role[]> {
  const queryParams: Record<string, boolean> = {};
  if (params.includeInactive !== undefined) queryParams.include_inactive = params.includeInactive;

  const response = await handleApiResponse<BackendRole[]>(
    apiClient.get(ADMIN_ENDPOINTS.roles, { params: queryParams })
  );
  return response.map(transformRole);
}

/**
 * Create a new role with permission IDs
 */
export async function createRole(data: CreateRolePayload): Promise<Role> {
  const response = await handleApiResponse<BackendRole>(
    apiClient.post(ADMIN_ENDPOINTS.roles, toBackendCreateRolePayload(data))
  );
  return transformRole(response);
}

/**
 * Update a role (cannot update system roles)
 */
export async function updateRole(id: string, data: UpdateRolePayload): Promise<Role> {
  const response = await handleApiResponse<BackendRole>(
    apiClient.patch(ADMIN_ENDPOINTS.role(id), toBackendUpdateRolePayload(data))
  );
  return transformRole(response);
}

/**
 * Delete a role (cannot delete system roles)
 */
export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(ADMIN_ENDPOINTS.role(id));
}

// =============================================================================
// Audit Log Endpoints
// =============================================================================

export interface AuditLogListParams extends AuditLogsFilters {
  page?: number;
  pageSize?: number;
}

/**
 * Get audit logs (paginated)
 */
export async function getAuditLogs(params: AuditLogListParams = {}): Promise<AuditLogsResponse> {
  const queryParams: Record<string, string | number> = {};

  if (params.page !== undefined) queryParams.page = params.page;
  if (params.pageSize !== undefined) queryParams.page_size = params.pageSize;
  if (params.targetUserId) queryParams.target_user_id = params.targetUserId;
  if (params.action) queryParams.action = params.action;
  if (params.resourceType) queryParams.resource_type = params.resourceType;
  if (params.status) queryParams.status = params.status;
  if (params.startDate) queryParams.start_date = params.startDate;
  if (params.endDate) queryParams.end_date = params.endDate;

  const response = await handleApiResponse<BackendAuditLogsResponse>(
    apiClient.get(ADMIN_ENDPOINTS.auditLogs, { params: queryParams })
  );
  return transformAuditLogsResponse(response);
}

// =============================================================================
// Token Usage Analytics Endpoints
// =============================================================================

/**
 * Get token usage analytics with filters
 */
export async function getTokenUsageAnalytics(
  params: TokenUsageAnalyticsParams = {}
): Promise<TokenUsageAnalytics> {
  const queryParams: Record<string, string | number> = {};

  if (params.period) queryParams.period = params.period;
  if (params.startDate) queryParams.start_date = params.startDate;
  if (params.endDate) queryParams.end_date = params.endDate;
  if (params.userSearch) queryParams.user_search = params.userSearch;
  if (params.targetUserId) queryParams.target_user_id = params.targetUserId;
  if (params.groupBy) queryParams.group_by = params.groupBy;
  if (params.page !== undefined) queryParams.page = params.page;
  if (params.pageSize !== undefined) queryParams.page_size = params.pageSize;

  // Handle department_ids array - axios supports arrays natively with paramsSerializer
  const finalParams: Record<string, string | number | string[]> = { ...queryParams };
  if (params.departmentIds && params.departmentIds.length > 0) {
    finalParams.department_ids = params.departmentIds;
  }

  const response = await handleApiResponse<BackendTokenUsageAnalytics>(
    apiClient.get(ADMIN_ENDPOINTS.tokenUsageAnalytics, {
      params: finalParams,
      paramsSerializer: {
        indexes: null, // Serialize arrays as department_ids=1&department_ids=2
      },
    })
  );
  return transformTokenUsageAnalytics(response);
}

/**
 * Get token usage details for a specific user
 */
export async function getTokenUsageUserDetails(
  userId: string,
  params: TokenUsageUserParams = {}
): Promise<TokenUsageUserDetails> {
  const queryParams: Record<string, string> = {};

  if (params.period) queryParams.period = params.period;
  if (params.startDate) queryParams.start_date = params.startDate;
  if (params.endDate) queryParams.end_date = params.endDate;

  const response = await handleApiResponse<BackendTokenUsageUserDetails>(
    apiClient.get(ADMIN_ENDPOINTS.tokenUsageUserDetails(userId), {
      params: queryParams,
    })
  );
  return transformTokenUsageUserDetails(response);
}

/**
 * Get token usage summary by departments
 */
export async function getTokenUsageDepartments(
  params: TokenUsageDepartmentsParams = {}
): Promise<TokenUsageDepartments> {
  const queryParams: Record<string, string> = {};

  if (params.period) queryParams.period = params.period;
  if (params.startDate) queryParams.start_date = params.startDate;
  if (params.endDate) queryParams.end_date = params.endDate;

  const response = await handleApiResponse<BackendTokenUsageDepartments>(
    apiClient.get(ADMIN_ENDPOINTS.tokenUsageDepartments, {
      params: queryParams,
    })
  );
  return transformTokenUsageDepartments(response);
}

/**
 * Get detailed analytics for a specific user
 * Includes profile, quota status, usage analytics, weekly history, and activity stats
 */
export async function getUserDetailedAnalytics(
  userId: string,
  params: TokenUsageUserParams = {}
): Promise<UserDetailedAnalyticsResponse> {
  const queryParams: Record<string, string> = {};

  if (params.period) queryParams.period = params.period;
  if (params.startDate) queryParams.start_date = params.startDate;
  if (params.endDate) queryParams.end_date = params.endDate;

  const response = await handleApiResponse<BackendUserDetailedAnalyticsResponse>(
    apiClient.get(ADMIN_ENDPOINTS.userDetailedAnalytics(userId), {
      params: queryParams,
    })
  );
  return transformUserDetailedAnalytics(response);
}

// =============================================================================
// Feedback Endpoints
// =============================================================================

/**
 * Get all feedbacks with admin filters
 */
export async function getAdminFeedbacks(
  params?: AdminFeedbackFilters
): Promise<FeedbackListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }
  if (params?.category) {
    queryParams.append('category', params.category);
  }
  if (params?.status) {
    queryParams.append('status', params.status);
  }
  if (params?.user_id) {
    queryParams.append('user_id', params.user_id);
  }

  const queryString = queryParams.toString();
  const url = queryString ? `${ADMIN_ENDPOINTS.feedback}?${queryString}` : ADMIN_ENDPOINTS.feedback;

  const response = await handleApiResponse<FeedbackListResponse>(
    apiClient.get<FeedbackListResponse>(url)
  );
  return response;
}

/**
 * Update feedback status and/or admin response
 */
export async function updateAdminFeedback(
  feedbackId: string,
  data: UpdateAdminFeedbackInput
): Promise<Feedback> {
  const response = await handleApiResponse<Feedback>(
    apiClient.put<Feedback>(ADMIN_ENDPOINTS.feedbackById(feedbackId), data)
  );
  return response;
}

// =============================================================================
// Exports
// =============================================================================

export const adminApi = {
  // Dashboard
  getDashboard: getAdminDashboard,

  // Permissions (NEW)
  getPermissions,
  getPermissionsGrouped,

  // Quotas
  getQuotas: getAdminQuotas,
  updateQuota: updateUserQuota,
  suspendUser,
  unsuspendUser,

  // Users
  getUsers: getAdminUsers,
  onboardUser,
  createUser,

  // Departments
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // Roles
  getRoles,
  createRole,
  updateRole,
  deleteRole,

  // Audit Logs
  getAuditLogs,

  // Token Usage Analytics
  getTokenUsageAnalytics,
  getTokenUsageUserDetails,
  getTokenUsageDepartments,
  getUserDetailedAnalytics,

  // Feedback
  getFeedbacks: getAdminFeedbacks,
  updateFeedback: updateAdminFeedback,
};

export default adminApi;

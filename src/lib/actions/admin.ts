'use server';

/**
 * Admin Server Actions
 * Server-side data fetching for admin pages
 * Uses cookies for authentication instead of localStorage
 */

import { cookies } from 'next/headers';
import { API_CONFIG } from '@/config/constants';
import {
  transformAdminDashboard,
  transformAdminUser,
  transformDepartment,
  transformRole,
  transformAdminQuotasResponse,
  type AdminDashboard,
  type AdminQuotasResponse,
  type AdminUser,
  type Department,
  type Role,
  type BackendAdminDashboard,
  type BackendAdminUser,
  type BackendAdminQuotasResponse,
  type BackendDepartment,
  type BackendRole,
} from '@/types/rbac';
import {
  transformTokenUsageAnalytics,
  type TokenUsageAnalytics,
  type TokenUsageAnalyticsParams,
  type BackendTokenUsageAnalytics,
} from '@/types/analytics';

/**
 * Create authenticated fetch options using cookies
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get('vora_access_token')?.value;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generic fetch wrapper for server actions
 */
async function serverFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
    cache: 'no-store', // Always fetch fresh data
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// Dashboard Actions
// =============================================================================

/**
 * Fetch admin dashboard data
 */
export async function fetchAdminDashboard(): Promise<AdminDashboard | null> {
  try {
    const data = await serverFetch<BackendAdminDashboard>('/api/admin/dashboard');
    return transformAdminDashboard(data);
  } catch (error) {
    console.error('[ServerAction] fetchAdminDashboard error:', error);
    return null;
  }
}

// =============================================================================
// Analytics Actions
// =============================================================================

/**
 * Fetch token usage analytics
 */
export async function fetchTokenUsageAnalytics(
  params: TokenUsageAnalyticsParams = {}
): Promise<TokenUsageAnalytics | null> {
  try {
    const queryParams = new URLSearchParams();

    if (params.period) queryParams.set('period', params.period);
    if (params.startDate) queryParams.set('start_date', params.startDate);
    if (params.endDate) queryParams.set('end_date', params.endDate);
    if (params.userSearch) queryParams.set('user_search', params.userSearch);
    if (params.targetUserId) queryParams.set('target_user_id', params.targetUserId);
    if (params.groupBy) queryParams.set('group_by', params.groupBy);
    if (params.page !== undefined) queryParams.set('page', params.page.toString());
    if (params.pageSize !== undefined) queryParams.set('page_size', params.pageSize.toString());
    if (params.departmentIds) {
      params.departmentIds.forEach(id => queryParams.append('department_ids', id));
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/admin/analytics/token-usage${queryString ? `?${queryString}` : ''}`;

    const data = await serverFetch<BackendTokenUsageAnalytics>(endpoint);
    return transformTokenUsageAnalytics(data);
  } catch (error) {
    console.error('[ServerAction] fetchTokenUsageAnalytics error:', error);
    return null;
  }
}

// =============================================================================
// User Management Actions
// =============================================================================

interface UserListParams {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  roleId?: string;
  includeInactive?: boolean;
}

/**
 * Fetch admin users list
 */
export async function fetchAdminUsers(params: UserListParams = {}): Promise<{
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
} | null> {
  try {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) queryParams.set('page', params.page.toString());
    if (params.pageSize !== undefined) queryParams.set('page_size', params.pageSize.toString());
    if (params.departmentId) queryParams.set('department_id', params.departmentId);
    if (params.roleId) queryParams.set('role_id', params.roleId);
    if (params.includeInactive !== undefined) {
      queryParams.set('include_inactive', params.includeInactive.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ''}`;

    const response = await serverFetch<{
      users: BackendAdminUser[];
      total: number;
      page: number;
      page_size: number;
    }>(endpoint);

    return {
      users: response.users.map(transformAdminUser),
      total: response.total,
      page: response.page,
      pageSize: response.page_size,
    };
  } catch (error) {
    console.error('[ServerAction] fetchAdminUsers error:', error);
    return null;
  }
}

// =============================================================================
// Quotas Actions
// =============================================================================

interface QuotaListParams {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  sortBy?: 'percentage_used' | 'current_usage' | 'full_name';
  sortDesc?: boolean;
}

/**
 * Fetch admin quotas list
 */
export async function fetchAdminQuotas(
  params: QuotaListParams = {}
): Promise<AdminQuotasResponse | null> {
  try {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) queryParams.set('page', params.page.toString());
    if (params.pageSize !== undefined) queryParams.set('page_size', params.pageSize.toString());
    if (params.departmentId) queryParams.set('department_id', params.departmentId);
    if (params.sortBy) queryParams.set('sort_by', params.sortBy);
    if (params.sortDesc !== undefined) queryParams.set('sort_desc', params.sortDesc.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/admin/quotas${queryString ? `?${queryString}` : ''}`;

    const data = await serverFetch<BackendAdminQuotasResponse>(endpoint);
    return transformAdminQuotasResponse(data);
  } catch (error) {
    console.error('[ServerAction] fetchAdminQuotas error:', error);
    return null;
  }
}

// =============================================================================
// Departments & Roles Actions
// =============================================================================

/**
 * Fetch all departments
 */
export async function fetchDepartments(): Promise<Department[] | null> {
  try {
    const data = await serverFetch<BackendDepartment[]>('/api/admin/departments');
    return data.map(transformDepartment);
  } catch (error) {
    console.error('[ServerAction] fetchDepartments error:', error);
    return null;
  }
}

/**
 * Fetch all roles
 */
export async function fetchRoles(): Promise<Role[] | null> {
  try {
    const data = await serverFetch<BackendRole[]>('/api/admin/roles');
    return data.map(transformRole);
  } catch (error) {
    console.error('[ServerAction] fetchRoles error:', error);
    return null;
  }
}

// ============================================================================
// RBAC (Role-Based Access Control) Types - Sprint 3
// Updated for new Permission entity-based API
// ============================================================================

// =============================================================================
// Permission Types (NEW)
// =============================================================================

export type PermissionCategory = 'chat' | 'reports' | 'user_management' | 'admin' | 'system' | 'tools';

export type PermissionCode =
  // Chat permissions
  | 'chat:read'
  | 'chat:write'
  | 'chat:delete'
  // Reports permissions
  | 'reports:read'
  | 'reports:write'
  | 'reports:delete'
  // User management permissions
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'users:onboard'
  | 'team:read'
  // Admin permissions
  | 'roles:read'
  | 'roles:write'
  | 'roles:delete'
  | 'quotas:read'
  | 'quotas:write'
  | 'quotas:admin'
  | 'admin_panel:read'
  // System permissions
  | 'audit:read'
  // Tools permissions (agent tools)
  | 'tools:data:read'
  | 'tools:planning:read'
  | 'tools:planning:write'
  | 'tools:feedback:write';

export interface Permission {
  id: string;
  code: PermissionCode;
  name: string;
  description?: string;
  category: PermissionCategory;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendPermission {
  id: string;
  code: PermissionCode;
  name: string;
  description?: string;
  category: PermissionCategory;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupedPermissions {
  [category: string]: Permission[];
}

export interface BackendGroupedPermissions {
  categories: {
    [category: string]: BackendPermission[];
  };
}

// =============================================================================
// Permission Category Constants
// =============================================================================

/**
 * Labels for permission categories (Portuguese)
 * Used in admin roles page and profile page
 */
export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategory, string> = {
  chat: 'Chat',
  reports: 'Relatórios',
  user_management: 'Gestão de Usuários',
  admin: 'Administração',
  system: 'Sistema',
  tools: 'Ferramentas do Agente',
};

/**
 * Display order for permission categories
 * Tools comes before System as it's more commonly used
 */
export const PERMISSION_CATEGORY_ORDER: PermissionCategory[] = [
  'chat',
  'reports',
  'user_management',
  'admin',
  'tools',
  'system',
];

// =============================================================================
// Department Types
// =============================================================================

export interface Department {
  id: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendDepartment {
  id: string;
  name: string;
  description?: string;
  parent_department_id?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// Role Types
// =============================================================================

export type DataScope = 'own' | 'department' | 'all';

// Legacy types - kept for backward compatibility
/** @deprecated Use PermissionCode instead */
export type Feature = 'chat' | 'reports' | 'admin_panel' | 'user_management' | 'audit_logs';
/** @deprecated Use PermissionCode instead */
export type Action = 'read' | 'write' | 'delete' | 'manage';

/** @deprecated Use Permission[] instead */
export interface RolePermissions {
  data_scopes: DataScope[];
  features: Feature[];
  actions: Action[];
}

// New Role structure with Permission entities
export interface Role {
  id: string;
  name: string;
  level: number; // 1-5 hierarchy
  dataScopes: DataScope[];
  isSystemRole: boolean;
  isActive: boolean;
  description?: string;
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendRole {
  id: string;
  name: string;
  level: number;
  data_scopes: DataScope[];
  is_system_role: boolean;
  is_active: boolean;
  description?: string;
  permissions: BackendPermission[];
  created_at?: string;
  updated_at?: string;
}

// Payloads for role creation/update
export interface CreateRolePayload {
  name: string;
  level: number;
  dataScopes: DataScope[];
  permissionIds: string[];
  description?: string;
}

export interface BackendCreateRolePayload {
  name: string;
  level: number;
  data_scopes: DataScope[];
  permission_ids: string[];
  description?: string;
}

export interface UpdateRolePayload {
  name?: string;
  level?: number;
  dataScopes?: DataScope[];
  permissionIds?: string[];
  description?: string;
  isActive?: boolean;
}

export interface BackendUpdateRolePayload {
  name?: string;
  level?: number;
  data_scopes?: DataScope[];
  permission_ids?: string[];
  description?: string;
  is_active?: boolean;
}

// =============================================================================
// User Profile Types
// =============================================================================

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  employeeId?: string;
  departmentId?: string;
  roleId?: string;
  isActive: boolean;
  onboardedAt?: string;
  department?: Department;
  role?: Role;
}

export interface BackendUserProfile {
  id: string;
  user_id: string;
  full_name: string;
  employee_id?: string;
  department_id?: string;
  role_id?: string;
  is_active: boolean;
  onboarded_at?: string;
  department?: BackendDepartment;
  role?: BackendRole;
}

// =============================================================================
// Permissions Types
// =============================================================================

export interface UserPermissions {
  userId: string;
  roleId?: string;
  roleName?: string;
  roleLevel?: number;
  departmentId?: string;
  departmentName?: string;
  dataScopes: DataScope[];
  permissions: Permission[];
  permissionCodes: PermissionCode[];
  isAdmin: boolean;
}

export interface BackendUserPermissions {
  user_id: string;
  role_id?: string;
  role_name?: string;
  role_level?: number;
  department_id?: string;
  department_name?: string;
  data_scopes: DataScope[];
  permissions: BackendPermission[];
  is_admin: boolean;
}

// Mapping from legacy features to new permission codes
export const FEATURE_TO_PERMISSION_MAP: Record<Feature, PermissionCode[]> = {
  chat: ['chat:read', 'chat:write', 'chat:delete'],
  reports: ['reports:read', 'reports:write', 'reports:delete'],
  admin_panel: ['admin_panel:read'],
  user_management: ['users:read', 'users:write', 'users:delete', 'users:onboard', 'team:read'],
  audit_logs: ['audit:read'],
};

// Mapping from legacy actions to permission code patterns
export const ACTION_TO_PERMISSION_SUFFIX: Record<Action, string> = {
  read: ':read',
  write: ':write',
  delete: ':delete',
  manage: ':admin',
};

// =============================================================================
// Quota Types
// =============================================================================

export type QuotaPeriod = 'day' | 'week' | 'month';

export interface QuotaStatus {
  userId: string;
  allowed: boolean;
  currentUsage: number;
  quotaLimit: number;
  remaining: number;
  percentageUsed: number;
  isUnlimited: boolean;
  isSuspended: boolean;
  period: QuotaPeriod;
  periodResetsAt?: string;
  message?: string;
}

export interface BackendQuotaStatus {
  user_id: string;
  allowed: boolean;
  current_usage: number;
  quota_limit: number;
  remaining: number;
  percentage_used: number;
  is_unlimited: boolean;
  is_suspended: boolean;
  period: QuotaPeriod;
  period_resets_at?: string;
  message?: string;
}

export interface QuotaStats {
  userId: string;
  period: QuotaPeriod;
  periodStart: string;
  periodEnd: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalNormalized: number;
  totalConversations: number;
  totalMessages: number;
  avgTokensPerMessage: number;
  quotaLimit: number;
  percentageUsed: number;
}

export interface BackendQuotaStats {
  user_id: string;
  period: QuotaPeriod;
  period_start: string;
  period_end: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_normalized: number;
  total_conversations: number;
  total_messages: number;
  avg_tokens_per_message: number;
  quota_limit: number;
  percentage_used: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  quotaLimit: number;
  remaining: number;
  percentageUsed: number;
  isUnlimited: boolean;
  isSuspended: boolean;
  message?: string;
}

export interface BackendQuotaCheckResult {
  allowed: boolean;
  current_usage: number;
  quota_limit: number;
  remaining: number;
  percentage_used: number;
  is_unlimited: boolean;
  is_suspended: boolean;
  message?: string;
}

// =============================================================================
// Alert Types
// =============================================================================

export type AlertType = 'warning_50' | 'warning_80' | 'warning_90' | 'exceeded' | 'suspended';

export interface QuotaAlert {
  id: string;
  alertType: AlertType;
  thresholdPercent: number;
  currentUsageNormalized: number;
  quotaLimitNormalized: number;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface BackendQuotaAlert {
  id: string;
  alert_type: AlertType;
  threshold_percent: number;
  current_usage_normalized: number;
  quota_limit_normalized: number;
  acknowledged_at?: string;
  created_at: string;
}

export interface AlertsResponse {
  alerts: QuotaAlert[];
  total: number;
  unacknowledgedCount: number;
}

export interface BackendAlertsResponse {
  alerts: BackendQuotaAlert[];
  total: number;
  unacknowledged_count: number;
}

// =============================================================================
// Admin Types
// =============================================================================

export interface TopUserByUsage {
  userId: string;
  fullName: string;
  percentageUsed: number;
  currentUsage: number;
}

export interface BackendTopUserByUsage {
  user_id: string;
  full_name: string;
  percentage_used: number;
  current_usage: number;
}

export interface WeeklyUsageDailyData {
  date: string;
  totalTokens: number;
  normalizedTokens: number;
  requestCount: number;
  uniqueUsers: number;
}

export interface BackendWeeklyUsageDailyData {
  date: string;
  total_tokens: number;
  normalized_tokens: number;
  request_count: number;
  unique_users: number;
}

export interface WeeklyUsageSummary {
  totalTokens: number;
  normalizedTokens: number;
  totalRequests: number;
  uniqueUsers: number;
  totalConversations: number;
}

export interface BackendWeeklyUsageSummary {
  total_tokens: number;
  normalized_tokens: number;
  total_requests: number;
  unique_users: number;
  total_conversations: number;
}

export interface WeeklyUsagePreviousWeekComparison {
  tokensChangePercent: number | null;
  requestsChangePercent: number | null;
}

export interface BackendWeeklyUsagePreviousWeekComparison {
  tokens_change_percent: number | null;
  requests_change_percent: number | null;
}

export interface WeeklyUsage {
  dailyData: WeeklyUsageDailyData[];
  summary: WeeklyUsageSummary;
  previousWeekComparison: WeeklyUsagePreviousWeekComparison;
}

export interface BackendWeeklyUsage {
  daily_data: BackendWeeklyUsageDailyData[];
  summary: BackendWeeklyUsageSummary;
  previous_week_comparison: BackendWeeklyUsagePreviousWeekComparison;
}

export interface AdminDashboard {
  totalDepartments: number;
  totalRoles: number;
  totalUsers: number;
  totalSystemTokenUsage: number;
  topUsersByUsage: TopUserByUsage[];
  usersNearLimit: number;
  suspendedUsers: number;
  weeklyUsage?: WeeklyUsage;
}

export interface BackendAdminDashboard {
  total_departments: number;
  total_roles: number;
  total_users: number;
  total_system_token_usage: number;
  top_users_by_usage: BackendTopUserByUsage[];
  users_near_limit: number;
  suspended_users: number;
  weekly_usage?: BackendWeeklyUsage;
}

export interface AdminUserQuota {
  userId: string;
  fullName: string;
  email: string;
  departmentName?: string;
  roleName?: string;
  weeklyQuotaNormalized: number;
  currentWeeklyUsage: number;
  percentageUsed: number;
  isUnlimited: boolean;
  isSuspended: boolean;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalMessages: number;
}

export interface BackendAdminUserQuota {
  user_id: string;
  full_name: string;
  email: string;
  department_name?: string;
  role_name?: string;
  weekly_quota_normalized: number;
  current_weekly_usage: number;
  percentage_used: number;
  is_unlimited: boolean;
  is_suspended: boolean;
  total_input_tokens: number;
  total_output_tokens: number;
  total_messages: number;
}

export interface AdminQuotasResponse {
  users: AdminUserQuota[];
  total: number;
  totalSystemUsage: number;
  page: number;
  pageSize: number;
}

export interface BackendAdminQuotasResponse {
  users: BackendAdminUserQuota[];
  total: number;
  total_system_usage: number;
  page: number;
  page_size: number;
}

export interface UpdateQuotaPayload {
  weeklyQuotaNormalized?: number;
  isUnlimited?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
}

export interface BackendUpdateQuotaPayload {
  weekly_quota_normalized?: number;
  is_unlimited?: boolean;
  is_suspended?: boolean;
  suspension_reason?: string;
}

export interface AdminUser {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  employeeId?: string;
  departmentId?: string;
  departmentName?: string;
  roleId?: string;
  roleName?: string;
  roleLevel?: number;
  isActive: boolean;
  onboardedAt?: string;
  createdAt: string;
}

export interface BackendAdminUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  employee_id?: string;
  department_id?: string;
  role_id?: string;
  is_active: boolean;
  onboarded_at?: string;
  created_at: string;
  updated_at?: string;
  // Nested objects from API
  department?: BackendDepartment;
  role?: BackendRole;
}

export interface OnboardUserPayload {
  userId: string;
  fullName: string;
  employeeId?: string;
  departmentId: string;
  roleId: string;
}

export interface BackendOnboardUserPayload {
  user_id: string;
  full_name: string;
  employee_id?: string;
  department_id: string;
  role_id: string;
}

// =============================================================================
// Create User Types (Admin creates user with auth + profile + quota)
// =============================================================================

export interface CreateUserPayload {
  email: string;
  password: string;
  roleId: string;
  departmentId: string;
  fullName?: string;
  employeeId?: string;
  weeklyQuotaNormalized?: number;
  isUnlimited?: boolean;
}

export interface BackendCreateUserPayload {
  email: string;
  password: string;
  role_id: string;
  department_id: string;
  full_name?: string;
  employee_id?: string;
  weekly_quota_normalized?: number;
  is_unlimited?: boolean;
}

export interface CreateUserResponse {
  userId: string;
  email: string;
  temporaryPassword: string;
  fullName: string | null;
  employeeId: string | null;
  roleId: string;
  roleName: string;
  departmentId: string;
  departmentName: string;
  weeklyQuotaNormalized: number;
  isUnlimited: boolean;
  message: string;
}

export interface BackendCreateUserResponse {
  user_id: string;
  email: string;
  temporary_password: string;
  full_name: string | null;
  employee_id: string | null;
  role_id: string;
  role_name: string;
  department_id: string;
  department_name: string;
  weekly_quota_normalized: number;
  is_unlimited: boolean;
  message: string;
}

// =============================================================================
// Audit Log Types
// =============================================================================

// Action é string raw do backend: "POST /api/chat", "DELETE /api/conversations/123"
export type AuditAction = string;

// Métodos HTTP para filtro
export type AuditHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Status: success ou error (conforme API backend)
export type AuditStatus = 'success' | 'error';

export interface AuditLogDetails {
  status_code?: number;
  duration_seconds?: number;
  method?: string;
  path?: string;
  error?: string;
  [key: string]: unknown;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userName?: string;
  action: string;
  resourceType: string | null;
  resourceId?: string | null;
  details?: AuditLogDetails;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  queryText?: string | null;
  resultsCount?: number | null;
  ipAddress?: string;
  userAgent?: string;
  status: AuditStatus;
  createdAt: string;
}

export interface BackendAuditLog {
  id: string;
  user_id: string | null;
  user_name?: string;
  action: string;
  resource_type: string | null;
  resource_id?: string | null;
  details?: Record<string, unknown>;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  query_text?: string | null;
  results_count?: number | null;
  ip_address?: string;
  user_agent?: string;
  status: AuditStatus;
  created_at: string;
}

export interface AuditLogsFilters {
  targetUserId?: string;
  action?: string;
  resourceType?: string;
  status?: AuditStatus;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BackendAuditLogsResponse {
  logs: BackendAuditLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// =============================================================================
// SSE Event Types for Quota
// =============================================================================

export interface QuotaWarningEvent {
  warning: string;
  percentageUsed: number;
}

export interface QuotaExceededErrorEvent {
  error: string;
  quotaExceeded: boolean;
  percentageUsed: number;
}

// =============================================================================
// Transform Functions
// =============================================================================

export function transformPermission(backend: BackendPermission): Permission {
  return {
    id: backend.id,
    code: backend.code,
    name: backend.name,
    description: backend.description,
    category: backend.category,
    isActive: backend.is_active,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
  };
}

export function transformGroupedPermissions(backend: BackendGroupedPermissions): GroupedPermissions {
  const result: GroupedPermissions = {};
  for (const [category, permissions] of Object.entries(backend.categories)) {
    result[category] = permissions.map(transformPermission);
  }
  return result;
}

export function transformDepartment(backend: BackendDepartment): Department {
  return {
    id: backend.id,
    name: backend.name,
    description: backend.description,
    parentDepartmentId: backend.parent_department_id,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
  };
}

export function transformRole(backend: BackendRole): Role {
  return {
    id: backend.id,
    name: backend.name,
    level: backend.level,
    dataScopes: backend.data_scopes ?? [],
    isSystemRole: backend.is_system_role,
    isActive: backend.is_active,
    description: backend.description,
    permissions: (backend.permissions ?? []).map(transformPermission),
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
  };
}

export function transformUserProfile(backend: BackendUserProfile): UserProfile {
  return {
    id: backend.id,
    userId: backend.user_id,
    fullName: backend.full_name,
    employeeId: backend.employee_id,
    departmentId: backend.department_id,
    roleId: backend.role_id,
    isActive: backend.is_active,
    onboardedAt: backend.onboarded_at,
    department: backend.department ? transformDepartment(backend.department) : undefined,
    role: backend.role ? transformRole(backend.role) : undefined,
  };
}

export function transformUserPermissions(backend: BackendUserPermissions): UserPermissions {
  const permissions = (backend.permissions ?? []).map(transformPermission);
  return {
    userId: backend.user_id,
    roleId: backend.role_id,
    roleName: backend.role_name,
    roleLevel: backend.role_level,
    departmentId: backend.department_id,
    departmentName: backend.department_name,
    dataScopes: backend.data_scopes,
    permissions,
    permissionCodes: permissions.map((p) => p.code),
    isAdmin: backend.is_admin,
  };
}

export function transformQuotaStatus(backend: BackendQuotaStatus): QuotaStatus {
  return {
    userId: backend.user_id,
    allowed: backend.allowed,
    currentUsage: backend.current_usage,
    quotaLimit: backend.quota_limit,
    remaining: backend.remaining,
    percentageUsed: backend.percentage_used,
    isUnlimited: backend.is_unlimited,
    isSuspended: backend.is_suspended,
    period: backend.period,
    periodResetsAt: backend.period_resets_at,
    message: backend.message,
  };
}

export function transformQuotaStats(backend: BackendQuotaStats): QuotaStats {
  return {
    userId: backend.user_id,
    period: backend.period,
    periodStart: backend.period_start,
    periodEnd: backend.period_end,
    totalInputTokens: backend.total_input_tokens,
    totalOutputTokens: backend.total_output_tokens,
    totalTokens: backend.total_tokens,
    totalNormalized: backend.total_normalized,
    totalConversations: backend.total_conversations,
    totalMessages: backend.total_messages,
    avgTokensPerMessage: backend.avg_tokens_per_message,
    quotaLimit: backend.quota_limit,
    percentageUsed: backend.percentage_used,
  };
}

export function transformQuotaCheckResult(backend: BackendQuotaCheckResult): QuotaCheckResult {
  return {
    allowed: backend.allowed,
    currentUsage: backend.current_usage,
    quotaLimit: backend.quota_limit,
    remaining: backend.remaining,
    percentageUsed: backend.percentage_used,
    isUnlimited: backend.is_unlimited,
    isSuspended: backend.is_suspended,
    message: backend.message,
  };
}

export function transformQuotaAlert(backend: BackendQuotaAlert): QuotaAlert {
  return {
    id: backend.id,
    alertType: backend.alert_type,
    thresholdPercent: backend.threshold_percent,
    currentUsageNormalized: backend.current_usage_normalized,
    quotaLimitNormalized: backend.quota_limit_normalized,
    acknowledgedAt: backend.acknowledged_at,
    createdAt: backend.created_at,
  };
}

export function transformAlertsResponse(backend: BackendAlertsResponse): AlertsResponse {
  return {
    alerts: backend.alerts.map(transformQuotaAlert),
    total: backend.total,
    unacknowledgedCount: backend.unacknowledged_count,
  };
}

export function transformTopUserByUsage(backend: BackendTopUserByUsage): TopUserByUsage {
  return {
    userId: backend.user_id,
    fullName: backend.full_name,
    percentageUsed: backend.percentage_used,
    currentUsage: backend.current_usage,
  };
}

export function transformWeeklyUsageDailyData(backend: BackendWeeklyUsageDailyData): WeeklyUsageDailyData {
  return {
    date: backend.date,
    totalTokens: backend.total_tokens,
    normalizedTokens: backend.normalized_tokens,
    requestCount: backend.request_count,
    uniqueUsers: backend.unique_users,
  };
}

export function transformWeeklyUsageSummary(backend: BackendWeeklyUsageSummary): WeeklyUsageSummary {
  return {
    totalTokens: backend.total_tokens,
    normalizedTokens: backend.normalized_tokens,
    totalRequests: backend.total_requests,
    uniqueUsers: backend.unique_users,
    totalConversations: backend.total_conversations,
  };
}

export function transformWeeklyUsagePreviousWeekComparison(
  backend: BackendWeeklyUsagePreviousWeekComparison
): WeeklyUsagePreviousWeekComparison {
  return {
    tokensChangePercent: backend.tokens_change_percent,
    requestsChangePercent: backend.requests_change_percent,
  };
}

export function transformWeeklyUsage(backend: BackendWeeklyUsage): WeeklyUsage {
  return {
    dailyData: backend.daily_data.map(transformWeeklyUsageDailyData),
    summary: transformWeeklyUsageSummary(backend.summary),
    previousWeekComparison: transformWeeklyUsagePreviousWeekComparison(backend.previous_week_comparison),
  };
}

export function transformAdminDashboard(backend: BackendAdminDashboard): AdminDashboard {
  return {
    totalDepartments: backend.total_departments,
    totalRoles: backend.total_roles,
    totalUsers: backend.total_users,
    totalSystemTokenUsage: backend.total_system_token_usage,
    topUsersByUsage: backend.top_users_by_usage.map(transformTopUserByUsage),
    usersNearLimit: backend.users_near_limit,
    suspendedUsers: backend.suspended_users,
    weeklyUsage: backend.weekly_usage ? transformWeeklyUsage(backend.weekly_usage) : undefined,
  };
}

export function transformAdminUserQuota(backend: BackendAdminUserQuota): AdminUserQuota {
  return {
    userId: backend.user_id,
    fullName: backend.full_name,
    email: backend.email,
    departmentName: backend.department_name,
    roleName: backend.role_name,
    weeklyQuotaNormalized: backend.weekly_quota_normalized,
    currentWeeklyUsage: backend.current_weekly_usage,
    percentageUsed: backend.percentage_used,
    isUnlimited: backend.is_unlimited,
    isSuspended: backend.is_suspended,
    totalInputTokens: backend.total_input_tokens,
    totalOutputTokens: backend.total_output_tokens,
    totalMessages: backend.total_messages,
  };
}

export function transformAdminQuotasResponse(backend: BackendAdminQuotasResponse): AdminQuotasResponse {
  return {
    users: backend.users.map(transformAdminUserQuota),
    total: backend.total,
    totalSystemUsage: backend.total_system_usage,
    page: backend.page,
    pageSize: backend.page_size,
  };
}

export function transformAdminUser(backend: BackendAdminUser): AdminUser {
  return {
    id: backend.id,
    userId: backend.user_id,
    fullName: backend.full_name,
    email: backend.email,
    employeeId: backend.employee_id,
    departmentId: backend.department_id,
    departmentName: backend.department?.name,
    roleId: backend.role_id,
    roleName: backend.role?.name,
    roleLevel: backend.role?.level,
    isActive: backend.is_active,
    onboardedAt: backend.onboarded_at,
    createdAt: backend.created_at,
  };
}

export function transformAuditLog(backend: BackendAuditLog): AuditLog {
  return {
    id: backend.id,
    userId: backend.user_id,
    userName: backend.user_name,
    action: backend.action,
    resourceType: backend.resource_type,
    resourceId: backend.resource_id,
    details: backend.details as AuditLogDetails | undefined,
    oldValue: backend.old_value,
    newValue: backend.new_value,
    queryText: backend.query_text,
    resultsCount: backend.results_count,
    ipAddress: backend.ip_address,
    userAgent: backend.user_agent,
    status: backend.status,
    createdAt: backend.created_at,
  };
}

export function transformAuditLogsResponse(backend: BackendAuditLogsResponse): AuditLogsResponse {
  return {
    logs: backend.logs.map(transformAuditLog),
    total: backend.total,
    page: backend.page,
    pageSize: backend.page_size,
    totalPages: backend.total_pages,
  };
}

// =============================================================================
// Reverse Transform Functions (Frontend to Backend)
// =============================================================================

export function toBackendUpdateQuotaPayload(payload: UpdateQuotaPayload): BackendUpdateQuotaPayload {
  return {
    weekly_quota_normalized: payload.weeklyQuotaNormalized,
    is_unlimited: payload.isUnlimited,
    is_suspended: payload.isSuspended,
    suspension_reason: payload.suspensionReason,
  };
}

export function toBackendOnboardUserPayload(payload: OnboardUserPayload): BackendOnboardUserPayload {
  return {
    user_id: payload.userId,
    full_name: payload.fullName,
    employee_id: payload.employeeId,
    department_id: payload.departmentId,
    role_id: payload.roleId,
  };
}

export function toBackendCreateRolePayload(payload: CreateRolePayload): BackendCreateRolePayload {
  return {
    name: payload.name,
    level: payload.level,
    data_scopes: payload.dataScopes,
    permission_ids: payload.permissionIds,
    description: payload.description,
  };
}

export function toBackendUpdateRolePayload(payload: UpdateRolePayload): BackendUpdateRolePayload {
  const result: BackendUpdateRolePayload = {};
  if (payload.name !== undefined) result.name = payload.name;
  if (payload.level !== undefined) result.level = payload.level;
  if (payload.dataScopes !== undefined) result.data_scopes = payload.dataScopes;
  if (payload.permissionIds !== undefined) result.permission_ids = payload.permissionIds;
  if (payload.description !== undefined) result.description = payload.description;
  if (payload.isActive !== undefined) result.is_active = payload.isActive;
  return result;
}

export function toBackendCreateUserPayload(payload: CreateUserPayload): BackendCreateUserPayload {
  return {
    email: payload.email,
    password: payload.password,
    role_id: payload.roleId,
    department_id: payload.departmentId,
    full_name: payload.fullName,
    employee_id: payload.employeeId,
    weekly_quota_normalized: payload.weeklyQuotaNormalized,
    is_unlimited: payload.isUnlimited,
  };
}

export function transformCreateUserResponse(backend: BackendCreateUserResponse): CreateUserResponse {
  return {
    userId: backend.user_id,
    email: backend.email,
    temporaryPassword: backend.temporary_password,
    fullName: backend.full_name,
    employeeId: backend.employee_id,
    roleId: backend.role_id,
    roleName: backend.role_name,
    departmentId: backend.department_id,
    departmentName: backend.department_name,
    weeklyQuotaNormalized: backend.weekly_quota_normalized,
    isUnlimited: backend.is_unlimited,
    message: backend.message,
  };
}

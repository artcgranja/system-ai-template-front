/**
 * Analytics Types - Token Usage Analytics
 * Types for the token usage analytics API endpoints
 */

// =============================================================================
// Request Parameters
// =============================================================================

export type AnalyticsPeriod =
  | 'last_7_days'
  | 'last_14_days'
  | 'last_30_days'
  | 'last_60_days'
  | 'last_90_days'
  | 'last_180_days'
  | 'last_1_year'
  | 'last_2_years'
  | 'custom';
export type AnalyticsGroupBy = 'day' | 'week' | 'month';

export interface TokenUsageAnalyticsParams {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  departmentIds?: string[];
  userSearch?: string;
  targetUserId?: string;
  groupBy?: AnalyticsGroupBy;
  page?: number;
  pageSize?: number;
}

export interface TokenUsageUserParams {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}

export interface TokenUsageDepartmentsParams {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}

// =============================================================================
// Backend Response Types (snake_case)
// =============================================================================

export interface BackendAnalyticsSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_normalized_tokens: string;
  total_requests: number;
  total_conversations: number;
  total_users: number;
  avg_tokens_per_request: string;
  avg_tokens_per_user: string;
  total_cost_usd: number | null;
  previous_period_tokens: string;
  tokens_change_percent: string;
  previous_period_requests: number;
  requests_change_percent: string;
}

export interface BackendTimeSeriesDataPoint {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  normalized_tokens: string;
  request_count: number;
  unique_users: number;
  unique_conversations: number;
}

export interface BackendTimeSeries {
  data_points: BackendTimeSeriesDataPoint[];
  period_start: string;
  period_end: string;
  grouping: AnalyticsGroupBy;
}

export interface BackendModelBreakdown {
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  normalized_tokens: string;
  request_count: number;
  percentage_of_total: string;
}

export interface BackendUserBreakdownItem {
  user_id: string;
  full_name: string;
  email: string | null;
  department_id: string;
  department_name: string;
  role_name: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  normalized_tokens: string;
  request_count: number;
  conversation_count: number;
  weekly_quota_normalized: string;
  percentage_of_quota_used: string;
  is_unlimited: boolean;
  is_suspended: boolean;
  first_request_at: string | null;
  last_request_at: string | null;
  active_days: number;
}

export interface BackendUserBreakdown {
  users: BackendUserBreakdownItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BackendDepartmentBreakdown {
  department_id: string;
  department_name: string;
  user_count: number;
  active_users: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  normalized_tokens: string;
  request_count: number;
  conversation_count: number;
  avg_tokens_per_user: string;
  percentage_of_total: string;
}

export interface BackendTokenUsageAnalytics {
  summary: BackendAnalyticsSummary;
  time_series: BackendTimeSeries;
  model_breakdown: BackendModelBreakdown[];
  user_breakdown: BackendUserBreakdown;
  department_breakdown: BackendDepartmentBreakdown[];
  period: string;
  period_start: string;
  period_end: string;
  filters_applied: Record<string, unknown>;
  generated_at: string;
}

export interface BackendTokenUsageUserDetails {
  user: BackendUserBreakdownItem;
  daily_breakdown: BackendTimeSeriesDataPoint[];
  model_breakdown: BackendModelBreakdown[];
  period: string;
  period_start: string;
  period_end: string;
}

export interface BackendTokenUsageDepartments {
  departments: BackendDepartmentBreakdown[];
  period: string;
  period_start: string;
  period_end: string;
  total_system_tokens: string;
}

// =============================================================================
// User Detailed Analytics Backend Types (snake_case)
// =============================================================================

export interface BackendUserProfileInfo {
  user_id: string;
  full_name: string;
  email: string;
  department_id: string;
  department_name: string;
  role_id: string;
  role_name: string;
  created_at: string;
}

export interface BackendQuotaSettingsInfo {
  weekly_quota_normalized: number | null;
  monthly_quota_normalized: number | null;
  daily_quota_normalized: number | null;
  is_unlimited: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  suspended_at: string | null;
  last_reset_at: string | null;
}

export interface BackendCurrentQuotaStatus {
  current_usage: number;
  quota_limit: number;
  remaining: number;
  percentage_used: number;
  is_allowed: boolean;
  period_resets_at: string;
}

export interface BackendWeeklyUsageSummary {
  week_start: string;
  week_end: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  normalized_tokens: string;
  request_count: number;
  conversation_count: number;
  active_days: number;
}

export interface BackendActivityStats {
  first_request_at: string | null;
  last_request_at: string | null;
  total_lifetime_requests: number;
  total_lifetime_tokens: number;
  total_lifetime_normalized: string;
  total_conversations: number;
  avg_requests_per_day: number | string; // Backend can return as string
  avg_tokens_per_request: string;
  most_active_day: string | null;
  most_used_model: string | null;
}

export interface BackendUsageAnalytics {
  user: BackendUserBreakdownItem;
  daily_breakdown: BackendTimeSeriesDataPoint[];
  model_breakdown: BackendModelBreakdown[];
  period: string;
  period_start: string;
  period_end: string;
}

export interface BackendUserDetailedAnalyticsResponse {
  user_profile: BackendUserProfileInfo;
  current_quota_status: BackendCurrentQuotaStatus;
  quota_settings: BackendQuotaSettingsInfo;
  usage_analytics: BackendUsageAnalytics;
  weekly_history: BackendWeeklyUsageSummary[];
  activity_stats: BackendActivityStats;
  generated_at: string;
}

// =============================================================================
// Frontend Types (camelCase)
// =============================================================================

export interface AnalyticsSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalNormalizedTokens: number;
  totalRequests: number;
  totalConversations: number;
  totalUsers: number;
  avgTokensPerRequest: number;
  avgTokensPerUser: number;
  totalCostUsd: number | null;
  previousPeriodTokens: number;
  tokensChangePercent: number;
  previousPeriodRequests: number;
  requestsChangePercent: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  normalizedTokens: number;
  requestCount: number;
  uniqueUsers: number;
  uniqueConversations: number;
}

export interface TimeSeries {
  dataPoints: TimeSeriesDataPoint[];
  periodStart: string;
  periodEnd: string;
  grouping: AnalyticsGroupBy;
}

export interface ModelBreakdown {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  normalizedTokens: number;
  requestCount: number;
  percentageOfTotal: number;
}

export interface UserBreakdownItem {
  userId: string;
  fullName: string;
  email: string | null;
  departmentId: string;
  departmentName: string;
  roleName: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  normalizedTokens: number;
  requestCount: number;
  conversationCount: number;
  weeklyQuotaNormalized: number;
  percentageOfQuotaUsed: number;
  isUnlimited: boolean;
  isSuspended: boolean;
  firstRequestAt: string | null;
  lastRequestAt: string | null;
  activeDays: number;
}

export interface UserBreakdown {
  users: UserBreakdownItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DepartmentBreakdown {
  departmentId: string;
  departmentName: string;
  userCount: number;
  activeUsers: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  normalizedTokens: number;
  requestCount: number;
  conversationCount: number;
  avgTokensPerUser: number;
  percentageOfTotal: number;
}

export interface TokenUsageAnalytics {
  summary: AnalyticsSummary;
  timeSeries: TimeSeries;
  modelBreakdown: ModelBreakdown[];
  userBreakdown: UserBreakdown;
  departmentBreakdown: DepartmentBreakdown[];
  period: string;
  periodStart: string;
  periodEnd: string;
  filtersApplied: Record<string, unknown>;
  generatedAt: string;
}

export interface TokenUsageUserDetails {
  user: UserBreakdownItem;
  dailyBreakdown: TimeSeriesDataPoint[];
  modelBreakdown: ModelBreakdown[];
  period: string;
  periodStart: string;
  periodEnd: string;
}

export interface TokenUsageDepartments {
  departments: DepartmentBreakdown[];
  period: string;
  periodStart: string;
  periodEnd: string;
  totalSystemTokens: number;
}

// =============================================================================
// User Detailed Analytics Frontend Types (camelCase)
// =============================================================================

export interface UserProfileInfo {
  userId: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  roleId: string;
  roleName: string;
  createdAt: string;
}

export interface QuotaSettingsInfo {
  weeklyQuotaNormalized: number | null;
  monthlyQuotaNormalized: number | null;
  dailyQuotaNormalized: number | null;
  isUnlimited: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspendedAt: string | null;
  lastResetAt: string | null;
}

export interface CurrentQuotaStatus {
  currentUsage: number;
  quotaLimit: number;
  remaining: number;
  percentageUsed: number;
  isAllowed: boolean;
  periodResetsAt: string;
}

export interface WeeklyUsageSummary {
  weekStart: string;
  weekEnd: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  normalizedTokens: number;
  requestCount: number;
  conversationCount: number;
  activeDays: number;
}

export interface ActivityStats {
  firstRequestAt: string | null;
  lastRequestAt: string | null;
  totalLifetimeRequests: number;
  totalLifetimeTokens: number;
  totalLifetimeNormalized: number;
  totalConversations: number;
  avgRequestsPerDay: number;
  avgTokensPerRequest: number;
  mostActiveDay: string | null;
  mostUsedModel: string | null;
}

export interface UsageAnalytics {
  user: UserBreakdownItem;
  dailyBreakdown: TimeSeriesDataPoint[];
  modelBreakdown: ModelBreakdown[];
  period: string;
  periodStart: string;
  periodEnd: string;
}

export interface UserDetailedAnalyticsResponse {
  userProfile: UserProfileInfo;
  currentQuotaStatus: CurrentQuotaStatus;
  quotaSettings: QuotaSettingsInfo;
  usageAnalytics: UsageAnalytics;
  weeklyHistory: WeeklyUsageSummary[];
  activityStats: ActivityStats;
  generatedAt: string;
}

// =============================================================================
// Transformers (Backend -> Frontend)
// =============================================================================

export function transformAnalyticsSummary(backend: BackendAnalyticsSummary): AnalyticsSummary {
  return {
    totalInputTokens: backend.total_input_tokens,
    totalOutputTokens: backend.total_output_tokens,
    totalTokens: backend.total_tokens,
    totalNormalizedTokens: parseFloat(backend.total_normalized_tokens) || 0,
    totalRequests: backend.total_requests,
    totalConversations: backend.total_conversations,
    totalUsers: backend.total_users,
    avgTokensPerRequest: parseFloat(backend.avg_tokens_per_request) || 0,
    avgTokensPerUser: parseFloat(backend.avg_tokens_per_user) || 0,
    totalCostUsd: backend.total_cost_usd,
    previousPeriodTokens: parseFloat(backend.previous_period_tokens) || 0,
    tokensChangePercent: parseFloat(backend.tokens_change_percent) || 0,
    previousPeriodRequests: backend.previous_period_requests,
    requestsChangePercent: parseFloat(backend.requests_change_percent) || 0,
  };
}

export function transformTimeSeriesDataPoint(backend: BackendTimeSeriesDataPoint): TimeSeriesDataPoint {
  return {
    date: backend.date,
    inputTokens: backend.input_tokens,
    outputTokens: backend.output_tokens,
    totalTokens: backend.total_tokens,
    normalizedTokens: parseFloat(backend.normalized_tokens) || 0,
    requestCount: backend.request_count,
    uniqueUsers: backend.unique_users,
    uniqueConversations: backend.unique_conversations,
  };
}

export function transformTimeSeries(backend: BackendTimeSeries): TimeSeries {
  return {
    dataPoints: backend.data_points.map(transformTimeSeriesDataPoint),
    periodStart: backend.period_start,
    periodEnd: backend.period_end,
    grouping: backend.grouping,
  };
}

export function transformModelBreakdown(backend: BackendModelBreakdown): ModelBreakdown {
  return {
    modelName: backend.model_name,
    inputTokens: backend.input_tokens,
    outputTokens: backend.output_tokens,
    totalTokens: backend.total_tokens,
    normalizedTokens: parseFloat(backend.normalized_tokens) || 0,
    requestCount: backend.request_count,
    percentageOfTotal: parseFloat(backend.percentage_of_total) || 0,
  };
}

export function transformUserBreakdownItem(backend: BackendUserBreakdownItem): UserBreakdownItem {
  return {
    userId: backend.user_id,
    fullName: backend.full_name,
    email: backend.email,
    departmentId: backend.department_id,
    departmentName: backend.department_name,
    roleName: backend.role_name,
    totalInputTokens: backend.total_input_tokens,
    totalOutputTokens: backend.total_output_tokens,
    totalTokens: backend.total_tokens,
    normalizedTokens: parseFloat(backend.normalized_tokens) || 0,
    requestCount: backend.request_count,
    conversationCount: backend.conversation_count,
    weeklyQuotaNormalized: parseFloat(backend.weekly_quota_normalized) || 0,
    percentageOfQuotaUsed: parseFloat(backend.percentage_of_quota_used) || 0,
    isUnlimited: backend.is_unlimited,
    isSuspended: backend.is_suspended,
    firstRequestAt: backend.first_request_at,
    lastRequestAt: backend.last_request_at,
    activeDays: backend.active_days,
  };
}

export function transformUserBreakdown(backend: BackendUserBreakdown): UserBreakdown {
  return {
    users: backend.users.map(transformUserBreakdownItem),
    total: backend.total,
    page: backend.page,
    pageSize: backend.page_size,
    totalPages: backend.total_pages,
  };
}

export function transformDepartmentBreakdown(backend: BackendDepartmentBreakdown): DepartmentBreakdown {
  return {
    departmentId: backend.department_id,
    departmentName: backend.department_name,
    userCount: backend.user_count,
    activeUsers: backend.active_users,
    totalInputTokens: backend.total_input_tokens,
    totalOutputTokens: backend.total_output_tokens,
    totalTokens: backend.total_tokens,
    normalizedTokens: parseFloat(backend.normalized_tokens) || 0,
    requestCount: backend.request_count,
    conversationCount: backend.conversation_count,
    avgTokensPerUser: parseFloat(backend.avg_tokens_per_user) || 0,
    percentageOfTotal: parseFloat(backend.percentage_of_total) || 0,
  };
}

export function transformTokenUsageAnalytics(backend: BackendTokenUsageAnalytics): TokenUsageAnalytics {
  return {
    summary: transformAnalyticsSummary(backend.summary),
    timeSeries: transformTimeSeries(backend.time_series),
    modelBreakdown: backend.model_breakdown.map(transformModelBreakdown),
    userBreakdown: transformUserBreakdown(backend.user_breakdown),
    departmentBreakdown: backend.department_breakdown.map(transformDepartmentBreakdown),
    period: backend.period,
    periodStart: backend.period_start,
    periodEnd: backend.period_end,
    filtersApplied: backend.filters_applied,
    generatedAt: backend.generated_at,
  };
}

export function transformTokenUsageUserDetails(backend: BackendTokenUsageUserDetails): TokenUsageUserDetails {
  return {
    user: transformUserBreakdownItem(backend.user),
    dailyBreakdown: backend.daily_breakdown.map(transformTimeSeriesDataPoint),
    modelBreakdown: backend.model_breakdown.map(transformModelBreakdown),
    period: backend.period,
    periodStart: backend.period_start,
    periodEnd: backend.period_end,
  };
}

export function transformTokenUsageDepartments(backend: BackendTokenUsageDepartments): TokenUsageDepartments {
  return {
    departments: backend.departments.map(transformDepartmentBreakdown),
    period: backend.period,
    periodStart: backend.period_start,
    periodEnd: backend.period_end,
    totalSystemTokens: parseFloat(backend.total_system_tokens) || 0,
  };
}

// =============================================================================
// User Detailed Analytics Transformers
// =============================================================================

export function transformUserProfileInfo(backend: BackendUserProfileInfo): UserProfileInfo {
  return {
    userId: backend.user_id,
    fullName: backend.full_name,
    email: backend.email,
    departmentId: backend.department_id,
    departmentName: backend.department_name,
    roleId: backend.role_id,
    roleName: backend.role_name,
    createdAt: backend.created_at,
  };
}

export function transformQuotaSettingsInfo(backend: BackendQuotaSettingsInfo): QuotaSettingsInfo {
  return {
    weeklyQuotaNormalized: backend.weekly_quota_normalized,
    monthlyQuotaNormalized: backend.monthly_quota_normalized,
    dailyQuotaNormalized: backend.daily_quota_normalized,
    isUnlimited: backend.is_unlimited,
    isSuspended: backend.is_suspended,
    suspensionReason: backend.suspension_reason,
    suspendedAt: backend.suspended_at,
    lastResetAt: backend.last_reset_at,
  };
}

export function transformCurrentQuotaStatus(backend: BackendCurrentQuotaStatus): CurrentQuotaStatus {
  return {
    currentUsage: backend.current_usage,
    quotaLimit: backend.quota_limit,
    remaining: backend.remaining,
    percentageUsed: backend.percentage_used,
    isAllowed: backend.is_allowed,
    periodResetsAt: backend.period_resets_at,
  };
}

export function transformWeeklyUsageSummary(backend: BackendWeeklyUsageSummary): WeeklyUsageSummary {
  return {
    weekStart: backend.week_start,
    weekEnd: backend.week_end,
    inputTokens: backend.input_tokens,
    outputTokens: backend.output_tokens,
    totalTokens: backend.total_tokens,
    normalizedTokens: parseFloat(backend.normalized_tokens) || 0,
    requestCount: backend.request_count,
    conversationCount: backend.conversation_count,
    activeDays: backend.active_days,
  };
}

export function transformActivityStats(backend: BackendActivityStats): ActivityStats {
  return {
    firstRequestAt: backend.first_request_at,
    lastRequestAt: backend.last_request_at,
    totalLifetimeRequests: backend.total_lifetime_requests,
    totalLifetimeTokens: backend.total_lifetime_tokens,
    totalLifetimeNormalized: parseFloat(backend.total_lifetime_normalized) || 0,
    totalConversations: backend.total_conversations,
    avgRequestsPerDay: typeof backend.avg_requests_per_day === 'number' 
      ? backend.avg_requests_per_day 
      : (Number(backend.avg_requests_per_day) || 0),
    avgTokensPerRequest: parseFloat(backend.avg_tokens_per_request) || 0,
    mostActiveDay: backend.most_active_day,
    mostUsedModel: backend.most_used_model,
  };
}

export function transformUsageAnalytics(backend: BackendUsageAnalytics): UsageAnalytics {
  return {
    user: transformUserBreakdownItem(backend.user),
    dailyBreakdown: backend.daily_breakdown.map(transformTimeSeriesDataPoint),
    modelBreakdown: backend.model_breakdown.map(transformModelBreakdown),
    period: backend.period,
    periodStart: backend.period_start,
    periodEnd: backend.period_end,
  };
}

export function transformUserDetailedAnalytics(
  backend: BackendUserDetailedAnalyticsResponse
): UserDetailedAnalyticsResponse {
  return {
    userProfile: transformUserProfileInfo(backend.user_profile),
    currentQuotaStatus: transformCurrentQuotaStatus(backend.current_quota_status),
    quotaSettings: transformQuotaSettingsInfo(backend.quota_settings),
    usageAnalytics: transformUsageAnalytics(backend.usage_analytics),
    weeklyHistory: backend.weekly_history.map(transformWeeklyUsageSummary),
    activityStats: transformActivityStats(backend.activity_stats),
    generatedAt: backend.generated_at,
  };
}

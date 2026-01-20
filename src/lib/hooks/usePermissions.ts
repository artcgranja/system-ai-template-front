/**
 * Permissions Hook
 * Manages user's RBAC permissions and access control
 * Updated for new Permission entity-based API with permission codes
 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api/user';
import { useAuthCheck } from './utils/useAuthCheck';
import { QUERY_KEYS, DEFAULT_QUERY_CONFIG } from './config/queryConfig';
import type {
  UserPermissions,
  PermissionCode,
  PermissionCategory,
  DataScope,
  Feature,
  Action,
} from '@/types/rbac';
import { FEATURE_TO_PERMISSION_MAP, ACTION_TO_PERMISSION_SUFFIX } from '@/types/rbac';

export function usePermissions() {
  const isAuthenticated = useAuthCheck();

  // Fetch user permissions
  const {
    data: permissions,
    isLoading,
    error,
    refetch,
  } = useQuery<UserPermissions>({
    queryKey: QUERY_KEYS.userPermissions,
    queryFn: userApi.getPermissions,
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
    staleTime: 300000, // Permissions are stable, cache for 5 minutes
  });

  // ==========================================================================
  // NEW: Permission code-based checks
  // ==========================================================================

  /**
   * Check if user has a specific permission code
   * @example hasPermission('users:read')
   */
  const hasPermission = useCallback(
    (code: PermissionCode): boolean => {
      if (!permissions) return false;
      return permissions.permissionCodes.includes(code);
    },
    [permissions]
  );

  /**
   * Check if user has ANY of the specified permission codes (OR)
   * @example hasAnyPermission('users:read', 'users:write')
   */
  const hasAnyPermission = useCallback(
    (...codes: PermissionCode[]): boolean => {
      if (!permissions) return false;
      return codes.some((code) => permissions.permissionCodes.includes(code));
    },
    [permissions]
  );

  /**
   * Check if user has ALL of the specified permission codes (AND)
   * @example hasAllPermissions('users:read', 'users:write')
   */
  const hasAllPermissions = useCallback(
    (...codes: PermissionCode[]): boolean => {
      if (!permissions) return false;
      return codes.every((code) => permissions.permissionCodes.includes(code));
    },
    [permissions]
  );

  /**
   * Check if user has any permission in a specific category
   * @example hasPermissionInCategory('admin')
   */
  const hasPermissionInCategory = useCallback(
    (category: PermissionCategory): boolean => {
      if (!permissions) return false;
      return permissions.permissions.some((p) => p.category === category);
    },
    [permissions]
  );

  // ==========================================================================
  // BACKWARD COMPATIBILITY: Legacy feature/action checks (deprecated)
  // ==========================================================================

  /**
   * Check if user has access to a specific feature
   * @deprecated Use hasPermission() with specific permission codes instead
   */
  const hasFeature = useCallback(
    (feature: Feature): boolean => {
      if (!permissions) return false;
      const requiredCodes = FEATURE_TO_PERMISSION_MAP[feature] || [];
      // User has feature if they have any of the mapped permission codes
      return requiredCodes.some((code) => permissions.permissionCodes.includes(code));
    },
    [permissions]
  );

  /**
   * Check if user can perform a specific action
   * @deprecated Use hasPermission() with specific permission codes instead
   */
  const hasAction = useCallback(
    (action: Action): boolean => {
      if (!permissions) return false;
      const actionSuffix = ACTION_TO_PERMISSION_SUFFIX[action];
      return permissions.permissionCodes.some(
        (code) => code.endsWith(actionSuffix) || (action === 'manage' && code.includes(':admin'))
      );
    },
    [permissions]
  );

  /**
   * Check if user has a specific data scope
   */
  const hasDataScope = useCallback(
    (scope: DataScope): boolean => {
      if (!permissions) return false;
      return permissions.dataScopes.includes(scope);
    },
    [permissions]
  );

  /**
   * Check if user has multiple features (AND)
   * @deprecated Use hasAllPermissions() instead
   */
  const hasAllFeatures = useCallback(
    (...features: Feature[]): boolean => {
      return features.every((f) => hasFeature(f));
    },
    [hasFeature]
  );

  /**
   * Check if user has any of the features (OR)
   * @deprecated Use hasAnyPermission() instead
   */
  const hasAnyFeature = useCallback(
    (...features: Feature[]): boolean => {
      return features.some((f) => hasFeature(f));
    },
    [hasFeature]
  );

  /**
   * Check if user can access admin panel
   */
  const canAccessAdmin = useCallback((): boolean => {
    if (!permissions) return false;
    return permissions.isAdmin || permissions.permissionCodes.includes('admin_panel:read');
  }, [permissions]);

  /**
   * Check role level (1-5 hierarchy)
   * Higher level = more permissions
   */
  const hasMinRoleLevel = useCallback(
    (minLevel: number): boolean => {
      if (!permissions || !permissions.roleLevel) return false;
      return permissions.roleLevel >= minLevel;
    },
    [permissions]
  );

  return {
    permissions,
    isLoading,
    error,
    refetch,

    // NEW: Permission code checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionInCategory,

    // Data scope check
    hasDataScope,

    // BACKWARD COMPAT (deprecated)
    hasFeature,
    hasAction,
    hasAllFeatures,
    hasAnyFeature,

    // Role level check
    hasMinRoleLevel,

    // Convenience getters
    isAdmin: permissions?.isAdmin ?? false,
    canAccessAdmin: canAccessAdmin(),
    roleLevel: permissions?.roleLevel ?? 0,
    roleName: permissions?.roleName ?? '',
    departmentName: permissions?.departmentName ?? '',
    dataScopes: permissions?.dataScopes ?? [],
    permissionCodes: permissions?.permissionCodes ?? [],
  };
}

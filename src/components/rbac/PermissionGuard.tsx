'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { Feature, Action, DataScope, PermissionCode, PermissionCategory } from '@/types/rbac';

interface PermissionGuardProps {
  children: ReactNode;
  /** Fallback content when access is denied */
  fallback?: ReactNode;
  /** Require user to be admin */
  requireAdmin?: boolean;

  // NEW: Permission code-based checks
  /** Require ALL of these permission codes (AND) */
  requiredPermissions?: PermissionCode[];
  /** Require ANY of these permission codes (OR) */
  anyPermissions?: PermissionCode[];
  /** Require at least one permission in this category */
  requiredCategory?: PermissionCategory;

  // BACKWARD COMPAT: Legacy feature/action checks (deprecated)
  /** @deprecated Use requiredPermissions instead */
  requiredFeatures?: Feature[];
  /** @deprecated Use anyPermissions instead */
  anyFeatures?: Feature[];
  /** @deprecated Use requiredPermissions instead */
  requiredActions?: Action[];

  /** Require minimum role level (1-5) */
  minRoleLevel?: number;
  /** Require specific data scope */
  requiredScope?: DataScope;
  /** Show loading state while checking permissions */
  showLoading?: boolean;
}

/**
 * PermissionGuard - Conditional rendering based on RBAC permissions
 * Updated for new Permission entity-based API with permission codes
 *
 * Usage:
 * ```tsx
 * // NEW: Permission code-based (recommended)
 * <PermissionGuard requiredPermissions={['users:read', 'users:write']}>
 *   <UserManagement />
 * </PermissionGuard>
 *
 * <PermissionGuard anyPermissions={['admin_panel:read', 'audit:read']}>
 *   <AdminSection />
 * </PermissionGuard>
 *
 * // Admin check
 * <PermissionGuard requireAdmin>
 *   <AdminOnlyContent />
 * </PermissionGuard>
 *
 * // DEPRECATED: Legacy feature-based (still works for backward compat)
 * <PermissionGuard requiredFeatures={['reports']}>
 *   <ReportsSection />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  children,
  fallback = null,
  requireAdmin = false,
  // NEW props
  requiredPermissions,
  anyPermissions,
  requiredCategory,
  // BACKWARD COMPAT props
  requiredFeatures,
  anyFeatures,
  requiredActions,
  // Existing props
  minRoleLevel,
  requiredScope,
  showLoading = false,
}: PermissionGuardProps) {
  const {
    permissions,
    isLoading,
    isAdmin,
    // NEW methods
    hasAllPermissions,
    hasAnyPermission,
    hasPermissionInCategory,
    // BACKWARD COMPAT methods
    hasAction,
    hasDataScope,
    hasAllFeatures,
    hasAnyFeature,
    hasMinRoleLevel,
  } = usePermissions();

  // Show loading state if requested
  if (isLoading && showLoading) {
    return <PermissionLoadingState />;
  }

  // No permissions loaded yet or permissions object is empty/invalid
  if (!permissions || !Array.isArray(permissions.permissions)) {
    return <>{fallback}</>;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <>{fallback}</>;
  }

  // NEW: Check required permission codes (AND)
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasAllPermissions(...requiredPermissions)) {
      return <>{fallback}</>;
    }
  }

  // NEW: Check any permission codes (OR)
  if (anyPermissions && anyPermissions.length > 0) {
    if (!hasAnyPermission(...anyPermissions)) {
      return <>{fallback}</>;
    }
  }

  // NEW: Check permission category
  if (requiredCategory) {
    if (!hasPermissionInCategory(requiredCategory)) {
      return <>{fallback}</>;
    }
  }

  // BACKWARD COMPAT: Check required features (AND)
  if (requiredFeatures && requiredFeatures.length > 0) {
    if (!hasAllFeatures(...requiredFeatures)) {
      return <>{fallback}</>;
    }
  }

  // BACKWARD COMPAT: Check any features (OR)
  if (anyFeatures && anyFeatures.length > 0) {
    if (!hasAnyFeature(...anyFeatures)) {
      return <>{fallback}</>;
    }
  }

  // BACKWARD COMPAT: Check required actions
  if (requiredActions && requiredActions.length > 0) {
    const hasAllActions = requiredActions.every((action) => hasAction(action));
    if (!hasAllActions) {
      return <>{fallback}</>;
    }
  }

  // Check minimum role level
  if (minRoleLevel !== undefined) {
    if (!hasMinRoleLevel(minRoleLevel)) {
      return <>{fallback}</>;
    }
  }

  // Check required data scope
  if (requiredScope) {
    if (!hasDataScope(requiredScope)) {
      return <>{fallback}</>;
    }
  }

  // All checks passed - render children
  return <>{children}</>;
}

function PermissionLoadingState() {
  return (
    <div className="animate-pulse flex items-center justify-center p-4">
      <div className="h-4 w-32 bg-muted rounded" />
    </div>
  );
}

/**
 * HOC version of PermissionGuard for wrapping entire components
 */
export function withPermissionGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardProps: Omit<PermissionGuardProps, 'children'>
) {
  return function PermissionGuardedComponent(props: P) {
    return (
      <PermissionGuard {...guardProps}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}

export default PermissionGuard;

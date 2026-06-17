import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/lib/auth-context';

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook for role-based access control in components
 * Returns true if user has the required role(s)
 */
export function useRequireRole(role: string | string[]): boolean {
  const { isAuthenticated, hasRole, hasAnyRole } = useAuth();
  if (!isAuthenticated) return false;
  if (Array.isArray(role)) {
    return hasAnyRole(role);
  }
  return hasRole(role);
}

/**
 * Hook for permission-based access control in components
 * Returns true if user has the required permission(s)
 */
export function useRequirePermission(permission: string | string[]): boolean {
  const { isAuthenticated, hasPermission, hasAllPermissions } = useAuth();
  if (!isAuthenticated) return false;
  if (Array.isArray(permission)) {
    return hasAllPermissions(permission);
  }
  return hasPermission(permission);
}

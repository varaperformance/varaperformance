import { createContext } from 'react';
import type { MinimalProfileResponse } from '@varaperformance/core';

/**
 * User data from JWT payload
 */
export interface AuthUser {
  sub: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  isRestricted?: boolean;
}

/**
 * Auth context state
 */
export interface AuthContextValue {
  /** Current authenticated user (from JWT) */
  user: AuthUser | null;
  /** User's profile data (minimal - no PII) */
  profile: MinimalProfileResponse | null;
  /** Is currently loading auth/profile state */
  isLoading: boolean;
  /** Is user authenticated */
  isAuthenticated: boolean;
  /** Is profile completed (has completedAt) */
  isProfileComplete: boolean;
  /** Check if user has a specific role */
  hasRole: (role: string) => boolean;
  /** Check if user has a specific permission (resource:action format) */
  hasPermission: (permission: string) => boolean;
  /** Check if user has any of the specified roles */
  hasAnyRole: (roles: string[]) => boolean;
  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: string[]) => boolean;
  /** Logout and clear auth state */
  logout: () => Promise<void>;
  /** Refresh auth state */
  refresh: () => void;
  /** Refresh token and re-pull JWT-derived permissions/roles */
  refreshPermissions: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

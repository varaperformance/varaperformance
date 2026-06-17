/**
 * User public profile (safe to expose)
 */
export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  dateOfBirth: string | null;
}

/**
 * User public response (excludes sensitive fields)
 */
export interface UserPublicResponse {
  id: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile: UserProfile | null;
}

/**
 * Authentication tokens response
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login response data
 */
export interface LoginResponseData extends AuthTokens {}

/**
 * Token refresh response
 */
export interface RefreshResponseData extends AuthTokens {}

/**
 * User session info
 */
export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivity: string | null;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
}

/**
 * Password change success response
 */
export interface PasswordChangeData {
  message: string;
}

/**
 * Logout response
 */
export interface LogoutData {
  message: string;
}

import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/features/auth';
import { useConsentCheck } from '@/features/auth';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  redirectTo?: string;
  /** Skip consent check (for the re-consent page itself) */
  skipConsentCheck?: boolean;
  /** Required role(s) for access */
  requiredRole?: string | string[];
  /** Required permission(s) for access */
  requiredPermission?: string | string[];
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  skipConsentCheck = false,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps) {
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    isProfileComplete,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAllPermissions,
  } = useAuth();

  // SOC2/HIPAA: Check if user needs to re-consent to updated legal documents
  const { data: consentCheck, isLoading: isConsentLoading } = useConsentCheck({
    enabled: !skipConsentCheck && isAuthenticated && !isLoading,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole) {
    const hasRequiredRole = Array.isArray(requiredRole)
      ? hasAnyRole(requiredRole)
      : hasRole(requiredRole);

    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  // Check permission requirements
  if (requiredPermission) {
    const hasRequiredPermission = Array.isArray(requiredPermission)
      ? hasAllPermissions(requiredPermission)
      : hasPermission(requiredPermission);

    if (!hasRequiredPermission) {
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  // Redirect to profile creation if profile is incomplete
  // (skip for profile creation page and reconsent page)
  if (
    !isProfileComplete &&
    location.pathname !== '/profile/create' &&
    location.pathname !== '/reconsent'
  ) {
    return <Navigate to="/profile/create" state={{ from: location }} replace />;
  }

  // Skip consent check for the re-consent page to avoid redirect loop
  if (!skipConsentCheck && location.pathname !== '/reconsent') {
    if (isConsentLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    // SOC2/HIPAA: Redirect to re-consent page if needed
    if (consentCheck?.data?.needsReconsent) {
      return <Navigate to="/reconsent" state={{ from: location }} replace />;
    }
  }

  return children ?? <Outlet />;
}

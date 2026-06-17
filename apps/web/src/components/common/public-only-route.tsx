import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/features/auth';

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
  redirectTo?: string;
}

export function PublicOnlyRoute({
  children,
  redirectTo = '/dashboard',
}: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ?? <Outlet />;
}

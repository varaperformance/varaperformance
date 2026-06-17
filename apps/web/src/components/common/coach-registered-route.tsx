import { Link, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { useMyCoachProfile } from '@/features/coaching';

/**
 * Guards coach workspace routes to users who actually have a coach profile,
 * even when they have broad admin permissions.
 */
export function CoachRegisteredRoute() {
  const { data, isLoading, isError } = useMyCoachProfile();
  const coachProfile = data?.success ? data.data : null;

  if (isLoading) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Checking coach profile...</p>
      </div>
    );
  }

  if (isError || !coachProfile) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          You are not registered as a coach.
        </p>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/coaches">Browse Coaches</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/coaches/apply">Apply as Coach</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

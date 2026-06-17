import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useMe } from '@/features/auth';
import { useProfile } from '@/features/profile';
import { prefetchDashboardPreferences } from '@/features/dashboard/hooks/use-dashboard-preferences';
import { AuthContext, type AuthContextValue } from '@/lib/auth-context';
import api, { refreshSession } from '@/lib/api';
import { clearAuthTokens, getAccessToken } from '@/lib/auth-tokens';
import { isNativeApp } from '@/lib/capacitor';
import { scheduleNativeMainTabPrefetch } from '@/lib/native-route-prefetch';

/**
 * Routes that don't require authentication or profile completion
 * These are public pages that anyone can access
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/verification',
  '/about',
  '/features',
  '/blog',
  '/shop',
  '/pricing',
  '/contact',
  '/faq',
  '/terms',
  '/privacy',
  '/security',
  '/accessibility',
  '/calculators',
  '/status',
  '/spotlight',
  '/roadmap',
  '/careers',
  '/press',
  '/coaches',
  '/affiliate',
  '/release-notes',
  '/team',
  '/github-status',
  '/exercises',
  '/booking',
];

/**
 * Routes where profile completion redirect should be skipped
 * (auth pages, profile creation itself, profile viewing/editing)
 */
const PROFILE_EXEMPT_ROUTES = [
  '/login',
  '/register',
  '/verification',
  '/profile',
  '/profile/create',
  '/profile/edit',
  '/reconsent',
];

const STRAVA_SYNC_COOLDOWN_MS = 20 * 60 * 1000;
const STRAVA_LAST_SYNC_KEY = 'strava.foreground.lastSyncAt';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // On native apps, skip /me if there are no stored tokens (user is definitely unauthenticated)
  const hasNativeTokens = isNativeApp() ? !!getAccessToken() : true;

  // Fetch user from JWT (via /me endpoint)
  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
    refetch: refetchMe,
  } = useMe({ enabled: hasNativeTokens });

  // Extract user from response - format: { success: true, data: { user: JwtPayload } }
  const user = meData?.data?.user ?? null;

  const meErrorStatus =
    axios.isAxiosError(meError) && meError.response
      ? meError.response.status
      : null;
  const hasAuthFailure = meErrorStatus === 401 || meErrorStatus === 403;
  const hasTransientAuthFailure = isMeError && !hasAuthFailure;

  // Treat transient /me failures as unknown state instead of logged-out.
  const isAuthenticated = !!user;

  // Fetch profile only when authenticated
  const { data: profileData, isLoading: isProfileLoading } = useProfile({
    enabled: isAuthenticated,
  });

  const profile = profileData?.success ? profileData.data : null;
  const isProfileComplete = !!profile?.completedAt;

  // Combined loading state
  const isLoading =
    isMeLoading ||
    hasTransientAuthFailure ||
    (isAuthenticated && isProfileLoading);

  // Warm dashboard layout preferences so the first visit to /dashboard reuses cache.
  useEffect(() => {
    if (!isAuthenticated) return;
    void prefetchDashboardPreferences(queryClient);
  }, [isAuthenticated, queryClient]);

  // Native: prefetch main tab chunks after login (cold start already handled in main.tsx).
  useEffect(() => {
    if (!isAuthenticated || !isNativeApp()) return;
    scheduleNativeMainTabPrefetch();
  }, [isAuthenticated]);

  // Recover from intermittent /me request failures on protected routes.
  // Skip retry when rate-limited (429) to avoid cascading failures.
  const meIs429 =
    axios.isAxiosError(meError) && meError.response?.status === 429;

  useEffect(() => {
    if (!hasTransientAuthFailure || meIs429) return;

    const retryTimeout = window.setTimeout(() => {
      void refetchMe();
    }, 3000);

    return () => {
      window.clearTimeout(retryTimeout);
    };
  }, [hasTransientAuthFailure, meIs429, refetchMe]);

  // Redirect to profile creation if authenticated but profile incomplete
  // Only redirect when accessing non-public, non-exempt routes
  useEffect(() => {
    // Skip redirect if not authenticated or still loading
    if (!isAuthenticated || isLoading) return;

    // Skip if profile is complete
    if (isProfileComplete) return;

    // Check if current route is public (anyone can access)
    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) =>
        location.pathname === route ||
        location.pathname.startsWith(route + '/'),
    );
    if (isPublicRoute) return;

    // Check if current route is exempt from profile completion requirement
    const isExemptRoute = PROFILE_EXEMPT_ROUTES.some((route) =>
      location.pathname.startsWith(route),
    );
    if (isExemptRoute) return;

    // User is authenticated, profile incomplete, and on a protected route
    // Redirect to profile creation
    navigate('/profile/create', { replace: true });
  }, [
    isAuthenticated,
    isLoading,
    isProfileComplete,
    location.pathname,
    navigate,
  ]);

  const userRoles = user?.roles;
  const userPermissions = user?.permissions;

  const hasRole = useCallback(
    (role: string): boolean => userRoles?.includes(role) ?? false,
    [userRoles],
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean =>
      roles.some((r) => userRoles?.includes(r) ?? false),
    [userRoles],
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      const perms = userPermissions ?? [];
      return perms.some((userPerm) => {
        if (userPerm === permission) return true;
        if (userPerm === '*:*') return true;
        const [uR, uA] = userPerm.split(':');
        const [rR, rA] = permission.split(':');
        if (uA === '*' && uR === rR) return true;
        if (uR === '*' && uA === rA) return true;
        return false;
      });
    },
    [userPermissions],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean =>
      permissions.every((p) => hasPermission(p)),
    [hasPermission],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('idm/logout');
    } catch {
      // Ignore logout errors
    } finally {
      clearAuthTokens();
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  }, [queryClient, navigate]);

  const refresh = useCallback((): void => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  }, [queryClient]);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    await refreshSession();
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['me'] }),
      queryClient.refetchQueries({ queryKey: ['profile'] }),
    ]);
  }, [queryClient]);

  // Keep browser sessions alive proactively instead of waiting for a 401.
  useEffect(() => {
    if (!isAuthenticated) return;

    const maybeSyncStrava = async (): Promise<void> => {
      const lastSyncRaw = window.localStorage.getItem(STRAVA_LAST_SYNC_KEY);
      const lastSyncAt = lastSyncRaw ? Number(lastSyncRaw) : 0;

      if (
        Number.isFinite(lastSyncAt) &&
        Date.now() - lastSyncAt < STRAVA_SYNC_COOLDOWN_MS
      ) {
        return;
      }

      try {
        await api.post('integrations/strava/sync?limit=10');
        window.localStorage.setItem(STRAVA_LAST_SYNC_KEY, String(Date.now()));
      } catch {
        // Ignore when Strava isn't connected or sync is temporarily unavailable.
      }
    };

    const refreshSessionSilently = async (): Promise<void> => {
      try {
        await refreshSession();
      } catch {
        // Ignore here; normal request/response auth handling will decide redirects.
      }
    };

    // Run once after auth is established in case the user resumed an old tab.
    void refreshSessionSilently();
    void maybeSyncStrava();

    // Refresh before the default 1 hour access token expiry window.
    const intervalId = window.setInterval(
      () => {
        void refreshSessionSilently();
      },
      45 * 60 * 1000,
    );

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshSessionSilently();
        void maybeSyncStrava();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated,
      isProfileComplete,
      hasRole,
      hasPermission,
      hasAnyRole,
      hasAllPermissions,
      logout,
      refresh,
      refreshPermissions,
    }),
    [
      user,
      profile,
      isLoading,
      isAuthenticated,
      isProfileComplete,
      hasRole,
      hasPermission,
      hasAnyRole,
      hasAllPermissions,
      logout,
      refresh,
      refreshPermissions,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

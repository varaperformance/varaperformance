import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import './index.css';
import { BrowserRouter } from 'react-router';
import AppRoutes from './routes/routes';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './components/auth-provider';
import { AppErrorBoundary } from './components/common/app-error-boundary';
import RouteProgress from './components/common/route-progress';
import { CookieBanner } from './components/cookie-banner';
import { OfflineBanner } from './components/offline-banner';
import { getAccessToken, hydrateAuthTokens } from './lib/auth-tokens';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { parseDeepLinkUrl } from '@/lib/deep-links';
import { initNetworkListener, onNetworkChange, isOnline } from '@/lib/network';
import { initOfflineQueue } from '@/lib/offline-queue';
import { onNotificationAction } from '@/lib/local-notifications';
import { clearBadge } from '@/lib/badge';
import { syncHealthToBackend } from '@/lib/health-sync';
import { initGlobalHaptics } from '@/lib/global-haptics';
import {
  isBiometricEnabled,
  authenticateWithBiometric,
} from '@/lib/biometric-auth';
import {
  isBiometricAuthConfirmed,
  registerBiometricPrompt,
} from '@/lib/biometric-gate-state';
import { initPerformanceMonitoring } from '@/lib/performance';
import { prefetchCommonData } from '@/lib/query-optimization';

import { BiometricGate } from './components/biometric-gate';
import { ResponsiveToaster } from './components/responsive-toaster';
import { scheduleNativeMainTabPrefetch } from '@/lib/native-route-prefetch';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
const CHUNK_RELOAD_KEY = 'vara.chunk-reload-attempted';

// Clear the chunk-reload guard once the app loads successfully,
// so the next deployment can trigger a fresh auto-reload if needed.
window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);

// eslint-disable-next-line react-refresh/only-export-components
const ToastClickDismiss = () => {
  useEffect(() => {
    const handleToastClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const toastElement = target.closest('[data-sonner-toast]');
      if (!toastElement) return;

      const interactiveElement = target.closest(
        '[data-button], [data-action], [data-cancel], [data-close-button], a, button, input, select, textarea, label',
      );

      // Let explicit toast actions keep their own behavior.
      if (
        interactiveElement &&
        !interactiveElement.hasAttribute('data-sonner-toast')
      ) {
        return;
      }

      toast.dismiss();
    };

    document.addEventListener('click', handleToastClick);
    return () => {
      document.removeEventListener('click', handleToastClick);
    };
  }, []);

  return null;
};

// eslint-disable-next-line react-refresh/only-export-components
const HealthSyncIndicator = () => {
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBusy = (event: Event) => {
      const customEvent = event as CustomEvent<{ active?: boolean }>;
      setSyncing(Boolean(customEvent.detail?.active));
    };

    window.addEventListener('vara:health-sync-busy', onBusy);
    return () => {
      window.removeEventListener('vara:health-sync-busy', onBusy);
    };
  }, []);

  if (!syncing || !Capacitor.isNativePlatform()) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+8px)] z-[9999] flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs text-foreground shadow-lg backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        Syncing health data...
      </div>
    </div>
  );
};

// Wire Capacitor app resume to TanStack Query focus manager
let promptBiometric: (() => Promise<void>) | undefined;

/**
 * Show a full-screen overlay that blurs the app and presents a retry button.
 * This lives outside React because biometric fires before the tree mounts.
 */
function showBiometricOverlay() {
  if (document.getElementById('biometric-overlay')) return;
  document.body.style.filter = 'blur(20px)';
  document.body.style.pointerEvents = 'none';

  const overlay = document.createElement('div');
  overlay.id = 'biometric-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '99999',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
  } as CSSStyleDeclaration);

  const msg = document.createElement('p');
  Object.assign(msg.style, {
    color: '#fff',
    fontSize: '16px',
    fontFamily: 'system-ui, sans-serif',
  });
  msg.textContent = 'Authentication required to continue';
  overlay.appendChild(msg);

  const btn = document.createElement('button');
  Object.assign(btn.style, {
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    background: '#fff',
    color: '#000',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer',
  });
  btn.textContent = 'Unlock';
  btn.addEventListener('click', () => {
    if (promptBiometric) void promptBiometric();
  });
  overlay.appendChild(btn);

  document.documentElement.appendChild(overlay);
}

function hideBiometricOverlay() {
  document.body.style.filter = '';
  document.body.style.pointerEvents = '';
  const overlay = document.getElementById('biometric-overlay');
  if (overlay) overlay.remove();
}

if (Capacitor.isNativePlatform()) {
  let biometricPending = false;
  let backgroundAt = 0; // timestamp when app went inactive
  let lastVerifiedAt = 0; // timestamp of last successful biometric verify

  // Don't re-prompt biometric if user verified within the last 60 seconds
  const BIOMETRIC_COOLDOWN_MS = 60_000;
  // Only prompt if the app was backgrounded for at least 5 seconds
  // (Face ID overlay + passcode fallback can take 3–4 s)
  const BACKGROUND_THRESHOLD_MS = 5_000;

  promptBiometric = async () => {
    if (biometricPending) return;

    // Skip if recently verified
    if (lastVerifiedAt && Date.now() - lastVerifiedAt < BIOMETRIC_COOLDOWN_MS) {
      return;
    }

    // Only gate behind biometric if the server has confirmed auth.
    // A stale local token doesn't count — the /me query must succeed first.
    if (!isBiometricAuthConfirmed()) return;

    biometricPending = true;
    try {
      const enabled = await isBiometricEnabled();
      if (!enabled) return;
      const ok = await authenticateWithBiometric('Unlock Vara Performance');
      if (!ok) {
        showBiometricOverlay();
      } else {
        hideBiometricOverlay();
        lastVerifiedAt = Date.now();
      }
    } finally {
      biometricPending = false;
    }
  };

  // Register with shared state so BiometricGate can trigger it from React.
  registerBiometricPrompt(promptBiometric);

  // Initial biometric is handled by <BiometricGate> in the React tree.
  // The appStateChange handler below covers biometric on app resume.

  // NOTE: Initial health sync is deferred to bootstrap() after token hydration.
  // Calling syncHealthToBackend() here would race with hydrateAuthTokens(),
  // causing 401s because the access token cache is not yet populated.

  App.addListener('appStateChange', ({ isActive }) => {
    focusManager.setFocused(isActive);

    if (!isActive) {
      backgroundAt = Date.now();
      return;
    }

    void clearBadge();

    // Sync health data on app resume (only if signed in)
    if (getAccessToken()) {
      void syncHealthToBackend();
    }

    // Stamp the lastSeenAt so the BackgroundRunner skips notifications that
    // the socket will deliver now that we're back in the foreground.
    if (getAccessToken()) {
      void Preferences.set({
        key: 'vara.notifications.lastSeenAt',
        value: new Date().toISOString(),
      });
    }

    // Only prompt biometric if the app was in the background long enough.
    // Face ID overlay + passcode fallback cycles fire isActive false→true,
    // and the cooldown prevents re-prompting if the user just verified.
    if (!backgroundAt || Date.now() - backgroundAt < BACKGROUND_THRESHOLD_MS)
      return;
    backgroundAt = 0;
    if (promptBiometric) void promptBiometric();
  });

  // Deep link handler: route native app URL opens to the SPA router
  App.addListener('appUrlOpen', ({ url }) => {
    const path = parseDeepLinkUrl(url);
    if (path) {
      window.location.assign(path);
    }
  });

  // Local notification tap handler: navigate to relevant screen.
  // Handles both legacy scheduled reminders (supplement, water, habit) and
  // server-pushed notifications that carry a Vara NotificationType + actionUrl.
  void onNotificationAction((_actionId, extra) => {
    if (!extra?.type) return;

    // If the backend provided an explicit deep-link, prefer it.
    if (extra.actionUrl) {
      window.location.assign(extra.actionUrl);
      return;
    }

    // Legacy scheduled reminder types (set by local notification schedulers).
    switch (extra.type) {
      case 'supplement':
        window.location.assign('/health/stacks');
        return;
      case 'water':
        window.location.assign('/health/nutrition');
        return;
      case 'habit':
        window.location.assign('/health/habits');
        return;
      case 'coaching':
        window.location.assign('/calendar');
        return;
    }

    // Server notification types — route to the most relevant screen.
    switch (extra.type) {
      case 'MESSAGE_RECEIVED':
        window.location.assign('/messages');
        break;
      case 'BOOKING_REQUESTED':
      case 'BOOKING_APPROVED':
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_CANCELLED':
      case 'SESSION_REMINDER':
        window.location.assign('/calendar');
        break;
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_FAILED':
      case 'SUBSCRIPTION_RENEWED':
      case 'SUBSCRIPTION_CANCELLED':
        window.location.assign('/settings/billing');
        break;
      case 'ORDER_CONFIRMED':
      case 'ORDER_SHIPPED':
      case 'ORDER_REFUNDED':
        window.location.assign('/shop/orders');
        break;
      case 'GYM_PARTNER_REQUEST':
      case 'GYM_PARTNER_ACCEPTED':
        window.location.assign('/social');
        break;
      case 'POST_COMMENT_RECEIVED':
      case 'POST_HIGH_FIVED':
        window.location.assign('/elevate');
        break;
      case 'REVIEW_RECEIVED':
        window.location.assign('/coaching/reviews');
        break;
      case 'WORKOUT_PLAN_ASSIGNED':
        window.location.assign('/workouts/plans');
        break;
      case 'ACHIEVEMENT_UNLOCKED':
        window.location.assign('/achievements');
        break;
      case 'STACK_REMINDER':
        window.location.assign('/health/stacks');
        break;
      case 'INJECTION_REMINDER':
        window.location.assign('/health/injections');
        break;
      case 'CLIMB_REMINDER':
        window.location.assign('/health/climb');
        break;
      case 'PROFILE_VERIFIED':
      case 'AMBASSADOR_APPLICATION_APPROVED':
      case 'AMBASSADOR_APPLICATION_DENIED':
        window.location.assign('/settings/profile');
        break;
      case 'SYSTEM_ANNOUNCEMENT':
        window.location.assign('/notifications');
        break;
      default:
        window.location.assign('/notifications');
    }
  });
}

const configureNativeStatusBar = async () => {
  if (Capacitor.getPlatform() !== 'ios') {
    return;
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (error) {
    console.error('Failed to configure native status bar', error);
  }
};

void configureNativeStatusBar();

// Wire network status to TanStack Query onlineManager
void initNetworkListener().then(() => {
  onlineManager.setOnline(isOnline());
  onNetworkChange((connected) => {
    onlineManager.setOnline(connected);
  });
  initOfflineQueue();
});

initGlobalHaptics();

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      typeof reason === 'string'
        ? reason
        : reason instanceof Error
          ? reason.message
          : '';

    const isChunkLoadFailure =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('ChunkLoadError');

    if (!isChunkLoadFailure) {
      return;
    }

    const attempted = window.sessionStorage.getItem(CHUNK_RELOAD_KEY);
    if (attempted === '1') {
      return;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
  });
}

const hideNativeSplash = async () => {
  if (Capacitor.getPlatform() === 'web') {
    return;
  }

  try {
    // Let the first committed frame paint under the splash so users do not see
    // a blank WebView flash before Suspense fallbacks or layout appear.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    await SplashScreen.hide();
  } catch (error) {
    console.error('Failed to hide splash screen', error);
  }
};

async function bootstrap() {
  // Initialize performance monitoring
  initPerformanceMonitoring();

  await hydrateAuthTokens();

  // Prefetch commonly accessed data
  prefetchCommonData(queryClient);

  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add('native-capacitor');
  }

  // Biometric gate on initial launch is handled by <BiometricGate> inside
  // the React tree, which waits for the /me query to confirm authentication.

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
          <BrowserRouter>
            <RouteProgress />
            <AuthProvider>
              <BiometricGate />
              <AppErrorBoundary>
                <AppRoutes />
              </AppErrorBoundary>
              <OfflineBanner />
              <ToastClickDismiss />
              <CookieBanner />
              <ResponsiveToaster />
              <HealthSyncIndicator />
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );

  if (Capacitor.isNativePlatform() && getAccessToken()) {
    scheduleNativeMainTabPrefetch();
  }

  await hideNativeSplash();

  // Kick off health sync after the app has rendered, so launch feels responsive.
  if (Capacitor.isNativePlatform() && getAccessToken()) {
    window.setTimeout(() => {
      void syncHealthToBackend();
    }, 150);
  }
}

void bootstrap();

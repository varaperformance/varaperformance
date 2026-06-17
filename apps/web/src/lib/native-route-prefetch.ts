import { isNativeApp } from '@/lib/capacitor';

let mainTabPrefetchScheduled = false;

/**
 * Dynamic import specifiers must match `lazy(() => import(...))` in
 * `routes/lazy-pages.ts` so the bundler serves the same chunks.
 */
const MAIN_TAB_ROUTE_IMPORTS = [
  () => import('@/features/dashboard/pages/dashboard'),
  () => import('@/features/health/pages/health/workouts/workouts'),
  () => import('@/features/health/pages/health/nutrition/food-diary'),
  () => import('@/features/messaging/pages/messaging'),
] as const;

const TAB_HREF_TO_IMPORT: Record<
  string,
  (typeof MAIN_TAB_ROUTE_IMPORTS)[number]
> = {
  '/dashboard': MAIN_TAB_ROUTE_IMPORTS[0],
  '/workouts': MAIN_TAB_ROUTE_IMPORTS[1],
  '/food-diary': MAIN_TAB_ROUTE_IMPORTS[2],
  '/messages': MAIN_TAB_ROUTE_IMPORTS[3],
};

/** Warm the chunk for one bottom-tab target (call from pointerdown). */
export function prefetchNativeMainTabHref(href: string): void {
  if (!isNativeApp()) return;
  const loader = TAB_HREF_TO_IMPORT[href];
  if (loader) void loader();
}

/**
 * After first paint, prefetch all main tab routes during idle time so the
 * first tap does not wait on network + parse for a lazy chunk.
 */
export function scheduleNativeMainTabPrefetch(): void {
  if (!isNativeApp() || typeof window === 'undefined') return;
  if (mainTabPrefetchScheduled) return;
  mainTabPrefetchScheduled = true;

  const run = () => {
    for (const loader of MAIN_TAB_ROUTE_IMPORTS) {
      void loader();
    }
  };

  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => run(), { timeout: 2500 });
  } else {
    window.setTimeout(run, 400);
  }
}

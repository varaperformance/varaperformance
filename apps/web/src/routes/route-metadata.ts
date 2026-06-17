export interface RoutePrefetchMetadata {
  id: string;
  match: RegExp;
  load: () => Promise<unknown>;
}

/**
 * High-intent / heavy routes to prefetch on hover. Kept small to limit bandwidth
 * churn; secondary routes (recipes, workouts, food-diary, calculators) load on navigate.
 * Chunk loads are deferred with requestIdleCallback in `prefetchRoute`.
 */
export const routePrefetchMetadata: RoutePrefetchMetadata[] = [
  {
    id: 'dashboard',
    match: /^\/dashboard/,
    load: () => import('@/features/dashboard/pages/dashboard'),
  },
  { id: 'admin', match: /^\/admin(\/|$)/, load: () => import('@/admin/index') },
  {
    id: 'messages',
    match: /^\/messages/,
    load: () => import('@/features/messaging/pages/messaging'),
  },
  {
    id: 'calendar',
    match: /^\/calendar/,
    load: () => import('@/features/calendar/pages/calendar'),
  },
  {
    id: 'blog',
    match: /^\/blog(\/|$)/,
    load: () => import('@/features/blog/pages/blog'),
  },
  {
    id: 'shop',
    match: /^\/shop(\/|$)/,
    load: () => import('@/features/commerce/pages/shop'),
  },
];

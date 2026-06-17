import { routePrefetchMetadata } from '@/routes/route-metadata';

const prefetched = new Set<string>();

function runWhenIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: 2500 });
  } else {
    window.setTimeout(fn, 0);
  }
}

/**
 * Defer the dynamic import to idle time so we don't compete with the main thread
 * when the user is still scrolling a long nav list.
 */
export function prefetchRoute(to: string): void {
  if (!to || prefetched.has(to)) return;

  const candidate = routePrefetchMetadata.find(({ match }) => match.test(to));
  if (!candidate) return;

  prefetched.add(to);
  runWhenIdle(() => {
    void candidate.load().catch(() => {
      prefetched.delete(to);
    });
  });
}

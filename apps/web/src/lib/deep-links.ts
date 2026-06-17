import { isNativeApp } from '@/lib/capacitor';

const APP_DOMAIN = 'varaperformance.com';

/**
 * Routes that should be handled as deep links inside the SPA.
 * The router will navigate to the matched path instead of a full page reload.
 */
const DEEP_LINK_PREFIXES = [
  '/verify-email',
  '/reset-password',
  '/blog/',
  '/profile/',
  '/elevate/',
  '/shop/product/',
  '/coaching/',
  '/integrations/strava/callback',
] as const;

/**
 * Check whether a URL path should be handled as a deep link inside the app.
 */
export function isDeepLinkPath(path: string): boolean {
  return DEEP_LINK_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Parse an incoming URL (from `appUrlOpen` or a universal link) into an
 * internal SPA path — or `null` if the URL is not relevant.
 */
export function parseDeepLinkUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only handle our own domain (or custom scheme on native)
    if (
      !isNativeApp() &&
      parsed.hostname !== APP_DOMAIN &&
      parsed.hostname !== `www.${APP_DOMAIN}`
    ) {
      return null;
    }

    const path = parsed.pathname + parsed.search + parsed.hash;
    if (!path || path === '/') return null;

    return path;
  } catch {
    return null;
  }
}

/**
 * Build a shareable deep link URL for a given SPA path.
 */
export function buildDeepLinkUrl(path: string): string {
  return `https://${APP_DOMAIN}${path.startsWith('/') ? path : `/${path}`}`;
}

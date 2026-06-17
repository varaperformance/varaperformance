import axios from 'axios';
import type { z } from 'zod';
import { isNativeApp } from '@/lib/capacitor';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from '@/lib/auth-tokens';
import { enqueueMutation } from '@/lib/offline-queue';

const API_VERSION = import.meta.env.VITE_API_VERSION ?? 'v1';
export const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? `${API_ORIGIN}/${API_VERSION}/`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send/receive cookies
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export async function refreshSession(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const nativeRefreshToken = isNativeApp() ? getRefreshToken() : null;

  isRefreshing = true;
  refreshPromise = api
    .post(
      'idm/refresh',
      nativeRefreshToken ? { refreshToken: nativeRefreshToken } : {},
    )
    .then((response) => {
      const tokens = response.data?.data;
      if (isNativeApp() && tokens?.accessToken && tokens?.refreshToken) {
        setAuthTokens({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      }
      return undefined;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

const PUBLIC_ROUTE_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/verification',
  '/forgot-password',
  '/reset-password',
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
  '/integrations',
  '/release-notes',
  '/team',
  '/github-status',
  '/elevate',
  '/profile',
  '/exercises',
  '/booking',
  '/unauthorized',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((route) => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
}

api.interceptors.request.use((config) => {
  if (isNativeApp()) {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

// Response interceptor — prefix server-relative media proxy paths on native.
// The backend returns `/v1/media/file/{key}` for all media fields. On web
// these resolve against the same origin via Vite proxy. On Capacitor the
// origin differs, so we prefix with API_ORIGIN to make them absolute.
if (isNativeApp()) {
  const MEDIA_PROXY_PREFIX = '/v1/media/file/';

  function prefixRelative(obj: unknown): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        if (typeof item === 'string' && item.startsWith(MEDIA_PROXY_PREFIX)) {
          obj[i] = `${API_ORIGIN}${item}`;
        } else if (typeof item === 'object' && item !== null) {
          prefixRelative(item);
        }
      }
      return;
    }
    const record = obj as Record<string, unknown>;
    for (const [key, val] of Object.entries(record)) {
      if (typeof val === 'string' && val.startsWith(MEDIA_PROXY_PREFIX)) {
        record[key] = `${API_ORIGIN}${val}`;
      } else if (typeof val === 'object' && val !== null) {
        prefixRelative(val);
      }
    }
  }

  api.interceptors.response.use((response) => {
    if (response.data) {
      prefixRelative(response.data);
    }
    return response;
  });
}

// Response interceptor - handle errors
const QUEUEABLE_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const QUEUEABLE_PATHS = ['water', 'food-diary', 'workout-sessions'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Queue mutation requests that fail due to network errors (offline)
    if (
      isNativeApp() &&
      !error.response &&
      originalRequest &&
      QUEUEABLE_METHODS.has(originalRequest.method) &&
      QUEUEABLE_PATHS.some((path: string) =>
        originalRequest.url?.includes(path),
      )
    ) {
      await enqueueMutation(
        originalRequest.method as 'post' | 'put' | 'patch' | 'delete',
        originalRequest.url,
        originalRequest.data ? JSON.parse(originalRequest.data) : undefined,
      );
      return Promise.reject(error);
    }

    // Try a one-time silent refresh for protected API calls that got 401.
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('idm/refresh') &&
      !originalRequest.url?.includes('idm/login') &&
      !originalRequest.url?.includes('idm/register') &&
      !originalRequest.url?.includes('idm/verify') &&
      !originalRequest.url?.includes('idm/forgot-password') &&
      !originalRequest.url?.includes('idm/reset-password') &&
      !originalRequest.url?.includes('idm/resend-verification')
    ) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return api(originalRequest);
      } catch {
        if (isNativeApp()) {
          clearAuthTokens();
        }
        // Fall through to existing redirect logic.
      }
    }

    // Don't redirect for auth check endpoints or logout - let the AuthProvider handle it
    const isAuthCheckEndpoint = error.config?.url?.includes('idm/me');
    const isLogoutEndpoint = error.config?.url?.includes('idm/logout');
    const isOAuthEndpoint = error.config?.url?.includes('idm/oauth');
    const isAuthMutationEndpoint =
      error.config?.url?.includes('idm/login') ||
      error.config?.url?.includes('idm/register') ||
      error.config?.url?.includes('idm/verify') ||
      error.config?.url?.includes('idm/forgot-password') ||
      error.config?.url?.includes('idm/reset-password') ||
      error.config?.url?.includes('idm/resend-verification') ||
      error.config?.url?.includes('idm/refresh');

    const currentPath = window.location.pathname;
    const alreadyOnLoginPage = currentPath === '/login';
    const onPublicRoute = isPublicRoute(currentPath);

    if (
      error.response?.status === 401 &&
      !isAuthCheckEndpoint &&
      !isLogoutEndpoint &&
      !isOAuthEndpoint &&
      !isAuthMutationEndpoint &&
      !alreadyOnLoginPage &&
      !onPublicRoute
    ) {
      // Unauthorized - redirect to login (except for auth check, logout, and oauth endpoints)
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/**
 * POST with Zod schema validation
 * Validates input data and returns typed response data
 */
export async function postValidated<TInput, TOutput>(
  url: string,
  schema: z.ZodSchema<TInput>,
  data: unknown,
): Promise<TOutput> {
  const validated = schema.parse(data);
  const response = await api.post<TOutput>(url, validated);
  return response.data;
}

export default api;

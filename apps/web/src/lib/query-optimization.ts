import { QueryClient } from '@tanstack/react-query';

/**
 * Query optimization utilities for TanStack Query
 * Provides consistent caching strategies across the application
 */

// Cache time configurations based on data volatility
export const CACHE_TIMES = {
  // Static data that rarely changes
  STATIC: 24 * 60 * 60 * 1000, // 24 hours
  // Reference data that changes infrequently
  REFERENCE: 7 * 24 * 60 * 60 * 1000, // 7 days
  // User data that changes occasionally
  USER_DATA: 30 * 60 * 1000, // 30 minutes
  // Real-time data that changes frequently
  REALTIME: 0, // No cache
};

// Stale time configurations
export const STALE_TIMES = {
  // Static data
  STATIC: 24 * 60 * 60 * 1000, // 24 hours
  // Reference data (exercises, foods, etc.)
  REFERENCE: 5 * 60 * 1000, // 5 minutes
  // User data (workouts, health data)
  USER_DATA: 60 * 1000, // 1 minute
  // Active sessions
  ACTIVE_SESSION: 30 * 1000, // 30 seconds
  // Real-time data
  REALTIME: 0, // Always refetch
};

/**
 * Prefetch commonly accessed data on app startup
 */
export function prefetchCommonData(queryClient: QueryClient) {
  // Prefetch exercises (reference data)
  queryClient.prefetchQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { default: api } = await import('@/lib/api');
      const response = await api.get('exercises?limit=50');
      return response.data;
    },
    staleTime: STALE_TIMES.REFERENCE,
  });

  // Prefetch user profile if authenticated
  const token = localStorage.getItem('accessToken');
  if (token) {
    queryClient.prefetchQuery({
      queryKey: ['user', 'me'],
      queryFn: async () => {
        const { default: api } = await import('@/lib/api');
        const response = await api.get('users/me');
        return response.data;
      },
      staleTime: STALE_TIMES.USER_DATA,
    });
  }
}

/**
 * Optimistic update helper for mutations
 * Updates the cache immediately with the expected result
 */
export function optimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  newData: T | ((oldData: T | undefined) => T),
) {
  queryClient.setQueryData(queryKey, newData);
}

/**
 * Rollback helper for failed mutations
 */
export function rollbackUpdate(
  queryClient: QueryClient,
  queryKey: unknown[],
  previousData: unknown,
) {
  queryClient.setQueryData(queryKey, previousData);
}

/**
 * Configure query client with optimized defaults
 */
export function getOptimizedQueryConfig() {
  return {
    queries: {
      staleTime: 30 * 1000, // 30 seconds default
      gcTime: 10 * 60 * 1000, // 10 minutes default
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  };
}

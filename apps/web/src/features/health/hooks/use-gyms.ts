import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  GymResponse,
  GymsListData,
  GymLocationResponse,
  GymLocationsListData,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  GymResponse,
  GymLocationResponse,
  GymsListData,
  GymLocationsListData,
};

interface GymQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

interface GymLocationQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const gymKeys = {
  all: ['gyms'] as const,
  list: (params?: GymQueryParams) => [...gymKeys.all, params] as const,
  detail: (id: string) => ['gym', id] as const,
  locations: (gymId: string, params?: GymLocationQueryParams) =>
    ['gym-locations', gymId, params] as const,
};

// API functions
const getGyms = async (params?: GymQueryParams) => {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const queryString = searchParams.toString();
  const url = queryString ? `gyms?${queryString}` : 'gyms';
  const response = await api.get<SuccessResponse<GymsListData>>(url);
  return response.data;
};

const getGym = async (id: string) => {
  const response = await api.get<SuccessResponse<GymResponse>>(`gyms/${id}`);
  return response.data;
};

const getGymLocations = async (
  gymId: string,
  params?: GymLocationQueryParams,
) => {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const queryString = searchParams.toString();
  const url = queryString
    ? `gyms/${gymId}/locations?${queryString}`
    : `gyms/${gymId}/locations`;
  const response = await api.get<SuccessResponse<GymLocationsListData>>(url);
  return response.data;
};

/**
 * Fetch paginated list of gyms with optional search
 */
export function useGyms(
  params?: GymQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: gymKeys.list(params),
    queryFn: () => getGyms(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single gym by ID
 */
export function useGym(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: gymKeys.detail(id),
    queryFn: () => getGym(id),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch locations for a gym
 */
export function useGymLocations(
  gymId: string,
  params?: GymLocationQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: gymKeys.locations(gymId, params),
    queryFn: () => getGymLocations(gymId, params),
    enabled: (options?.enabled ?? true) && !!gymId,
    staleTime: 5 * 60 * 1000,
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  BodyMeasurementResponse,
  BodyMeasurementsListData,
  CreateBodyMeasurement,
} from '@varaperformance/core';

export type { BodyMeasurementResponse, BodyMeasurementsListData };

export interface MeasurementsQuery {
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export const measurementKeys = {
  all: ['measurements'] as const,
  list: (query: MeasurementsQuery) => [...measurementKeys.all, query] as const,
  detail: (id: string) => ['measurement', id] as const,
};

// API functions
const getMeasurements = async (query: MeasurementsQuery = {}) => {
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', String(query.limit));
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  const queryString = params.toString();
  const response = await api.get<SuccessResponse<BodyMeasurementsListData>>(
    `measurements${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getMeasurement = async (id: string) => {
  const response = await api.get<SuccessResponse<BodyMeasurementResponse>>(
    `measurements/${id}`,
  );
  return response.data;
};

const createMeasurement = async (data: CreateBodyMeasurement) => {
  const response = await api.post<SuccessResponse<BodyMeasurementResponse>>(
    'measurements',
    data,
  );
  return response.data;
};

const deleteMeasurement = async (id: string) => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `measurements/${id}`,
  );
  return response.data;
};

/**
 * Fetch body measurement entries
 */
export function useMeasurements(
  query: MeasurementsQuery | number = 30,
  options?: { enabled?: boolean },
) {
  const normalizedQuery: MeasurementsQuery =
    typeof query === 'number' ? { limit: query } : query;

  return useQuery({
    queryKey: measurementKeys.list(normalizedQuery),
    queryFn: () => getMeasurements(normalizedQuery),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch a single body measurement by ID
 */
export function useMeasurement(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: measurementKeys.detail(id),
    queryFn: () => getMeasurement(id),
    enabled: options?.enabled ?? !!id,
  });
}

/**
 * Create a new body measurement entry
 */
export function useCreateMeasurement(options?: {
  onSuccess?: (data: SuccessResponse<BodyMeasurementResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMeasurement,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: measurementKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a body measurement entry
 */
export function useDeleteMeasurement(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMeasurement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: measurementKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

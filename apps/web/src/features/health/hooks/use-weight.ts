import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  WeightLogResponse,
  WeightLogsListData,
  WeightGoalResponse,
  CreateWeightLog,
  UpdateWeightGoal,
} from '@varaperformance/core';

// Re-export types for convenience
export type { WeightLogResponse, WeightLogsListData, WeightGoalResponse };

// Query params type
export interface WeightLogsQuery {
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export const weightKeys = {
  all: ['weight-logs'] as const,
  list: (query: WeightLogsQuery) => [...weightKeys.all, query] as const,
  detail: (id: string) => ['weight-log', id] as const,
  goal: () => ['weight-goal'] as const,
};

// API functions
const getWeightLogs = async (query: WeightLogsQuery = {}) => {
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', String(query.limit));
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  const queryString = params.toString();
  const response = await api.get<SuccessResponse<WeightLogsListData>>(
    `weight${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getWeightLog = async (id: string) => {
  const response = await api.get<SuccessResponse<WeightLogResponse>>(
    `weight/${id}`,
  );
  return response.data;
};

const createWeightLog = async (data: CreateWeightLog) => {
  const response = await api.post<SuccessResponse<WeightLogResponse>>(
    'weight',
    data,
  );
  return response.data;
};

const deleteWeightLog = async (id: string) => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `weight/${id}`,
  );
  return response.data;
};

const getWeightGoal = async () => {
  const response =
    await api.get<SuccessResponse<WeightGoalResponse>>('weight/goal');
  return response.data;
};

const updateWeightGoal = async (data: UpdateWeightGoal) => {
  const response = await api.patch<SuccessResponse<WeightGoalResponse>>(
    'weight/goal',
    data,
  );
  return response.data;
};

/**
 * Fetch weight logs
 */
export function useWeightLogs(
  query: WeightLogsQuery | number = 30,
  options?: { enabled?: boolean },
) {
  const normalizedQuery: WeightLogsQuery =
    typeof query === 'number' ? { limit: query } : query;

  return useQuery({
    queryKey: weightKeys.list(normalizedQuery),
    queryFn: () => getWeightLogs(normalizedQuery),
    staleTime: 30 * 1000, // 30 seconds
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch a single weight log by ID
 */
export function useWeightLog(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: weightKeys.detail(id),
    queryFn: () => getWeightLog(id),
    enabled: options?.enabled ?? !!id,
  });
}

/**
 * Create a new weight log
 */
export function useCreateWeightLog(options?: {
  onSuccess?: (data: SuccessResponse<WeightLogResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWeightLog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: weightKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a weight log
 */
export function useDeleteWeightLog(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWeightLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Fetch weight goal
 */
export function useWeightGoal(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: weightKeys.goal(),
    queryFn: getWeightGoal,
    staleTime: 5 * 60 * 1000, // 5 minutes - goal doesn't change often
    enabled: options?.enabled ?? true,
  });
}

/**
 * Update weight goal
 */
export function useUpdateWeightGoal(options?: {
  onSuccess?: (data: SuccessResponse<WeightGoalResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWeightGoal,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: weightKeys.goal() });
      queryClient.invalidateQueries({ queryKey: weightKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

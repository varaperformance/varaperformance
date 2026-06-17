import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  WaterLogResponse,
  WaterGoalResponse,
  DailyWaterSummary,
  CreateWaterLog,
  WaterGoalData,
} from '@varaperformance/core';

// Re-export types for convenience
export type { WaterLogResponse, WaterGoalResponse, DailyWaterSummary };

export const waterKeys = {
  all: ['water'] as const,
  summary: (date?: string) => ['water-summary', date] as const,
  history: (startDate: string, endDate: string) =>
    ['water-history', startDate, endDate] as const,
  goal: () => ['water-goal'] as const,
};

// API functions
const getDailyWaterSummary = async (date?: string) => {
  const params = date ? `?date=${date}` : '';
  const response = await api.get<SuccessResponse<DailyWaterSummary>>(
    `water${params}`,
  );
  return response.data;
};

const logWater = async (data: CreateWaterLog) => {
  const response = await api.post<SuccessResponse<WaterLogResponse>>(
    'water',
    data,
  );
  return response.data;
};

const deleteWaterLog = async (id: string) => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `water/${id}`,
  );
  return response.data;
};

const getWaterGoal = async () => {
  const response =
    await api.get<SuccessResponse<WaterGoalResponse>>('water/goal');
  return response.data;
};

const updateWaterGoal = async (data: WaterGoalData) => {
  const response = await api.patch<SuccessResponse<WaterGoalResponse>>(
    'water/goal',
    data,
  );
  return response.data;
};

export interface WaterHistoryDay {
  date: string;
  totalOz: number;
  goalOz: number;
}

const getWaterHistory = async (startDate: string, endDate: string) => {
  const response = await api.get<SuccessResponse<{ days: WaterHistoryDay[] }>>(
    `water/history?startDate=${startDate}&endDate=${endDate}`,
  );
  return response.data;
};

/**
 * Fetch daily water summary (logs + goal progress)
 */
export function useDailyWaterSummary(
  date?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: waterKeys.summary(date),
    queryFn: () => getDailyWaterSummary(date),
    staleTime: 30 * 1000, // 30 seconds
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch daily water totals over a date range (for trend charts)
 */
export function useWaterHistory(
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean },
) {
  const datesOk = !!startDate && !!endDate;
  return useQuery({
    queryKey: waterKeys.history(startDate, endDate),
    queryFn: () => getWaterHistory(startDate, endDate),
    enabled: datesOk && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch water goal
 */
export function useWaterGoal() {
  return useQuery({
    queryKey: waterKeys.goal(),
    queryFn: getWaterGoal,
    staleTime: 5 * 60 * 1000, // 5 minutes - goal doesn't change often
  });
}

/**
 * Log water intake
 */
export function useLogWater(options?: {
  onSuccess?: (data: SuccessResponse<WaterLogResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logWater,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: waterKeys.summary() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update water goal
 */
export function useUpdateWaterGoal(options?: {
  onSuccess?: (data: SuccessResponse<WaterGoalResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWaterGoal,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: waterKeys.goal() });
      queryClient.invalidateQueries({ queryKey: waterKeys.summary() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a water log entry
 */
export function useDeleteWaterLog(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWaterLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: waterKeys.summary() });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

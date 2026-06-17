import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  UpdateLifestyleGoal,
  LifestyleInsightsResponse,
  LifestyleGoalResponse,
  SuccessResponse,
} from '@varaperformance/core';

export const lifestyleGoalKeys = {
  all: ['lifestyle-goal'] as const,
  current: () => [...lifestyleGoalKeys.all] as const,
  defaults: () => ['lifestyle-goal-defaults'] as const,
  insights: () => ['lifestyle-insights'] as const,
};

const getLifestyleGoal = async () => {
  const response =
    await api.get<SuccessResponse<LifestyleGoalResponse | null>>(
      'lifestyle-goal',
    );
  return response.data;
};

const getLifestyleGoalWithDefaults = async () => {
  const response = await api.get<SuccessResponse<LifestyleGoalResponse>>(
    'lifestyle-goal/defaults',
  );
  return response.data;
};

const updateLifestyleGoal = async (data: UpdateLifestyleGoal) => {
  const response = await api.post<SuccessResponse<LifestyleGoalResponse>>(
    'lifestyle-goal',
    data,
  );
  return response.data;
};

const getLifestyleInsights = async () => {
  const response = await api.get<SuccessResponse<LifestyleInsightsResponse>>(
    'lifestyle-goal/insights',
  );
  return response.data;
};

export function useLifestyleGoal() {
  return useQuery({
    queryKey: lifestyleGoalKeys.current(),
    queryFn: getLifestyleGoal,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLifestyleGoalWithDefaults(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: lifestyleGoalKeys.defaults(),
    queryFn: getLifestyleGoalWithDefaults,
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useLifestyleInsights(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: lifestyleGoalKeys.insights(),
    queryFn: getLifestyleInsights,
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateLifestyleGoal(options?: {
  onSuccess?: (data: SuccessResponse<LifestyleGoalResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLifestyleGoal,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lifestyleGoalKeys.all });
      queryClient.invalidateQueries({ queryKey: lifestyleGoalKeys.defaults() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  HabitResponse,
  HabitHeatmapEntry,
  CreateHabit,
  UpdateHabit,
} from '@varaperformance/core';

export const habitKeys = {
  all: ['habits'] as const,
  list: (includeInactive: boolean) =>
    [...habitKeys.all, includeInactive] as const,
  heatmapAll: ['habit-heatmap'] as const,
  heatmap: (from: string, to: string) =>
    [...habitKeys.heatmapAll, from, to] as const,
};

// API functions
const getHabits = async (includeInactive = false) => {
  const params = includeInactive ? '?includeInactive=true' : '';
  const response = await api.get<SuccessResponse<{ items: HabitResponse[] }>>(
    `habits${params}`,
  );
  return response.data;
};

const createHabit = async (data: CreateHabit) => {
  const response = await api.post<SuccessResponse<{ id: string }>>(
    'habits',
    data,
  );
  return response.data;
};

const updateHabit = async ({ id, ...data }: UpdateHabit & { id: string }) => {
  const response = await api.patch<SuccessResponse<{ id: string }>>(
    `habits/${id}`,
    data,
  );
  return response.data;
};

const deleteHabit = async (id: string) => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `habits/${id}`,
  );
  return response.data;
};

const toggleHabitLog = async ({
  habitId,
  date,
}: {
  habitId: string;
  date?: string;
}) => {
  const response = await api.post<SuccessResponse<{ completed: boolean }>>(
    `habits/${habitId}/toggle`,
    date ? { date } : {},
  );
  return response.data;
};

const getHeatmap = async (from: string, to: string) => {
  const response = await api.get<
    SuccessResponse<{ items: HabitHeatmapEntry[] }>
  >(`habits/heatmap?from=${from}&to=${to}`);
  return response.data;
};

/**
 * Fetch all active habits
 */
export function useHabits(
  includeInactive = false,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: habitKeys.list(includeInactive),
    queryFn: () => getHabits(includeInactive),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Create a new habit
 */
export function useCreateHabit(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Update a habit
 */
export function useUpdateHabit(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Delete a habit
 */
export function useDeleteHabit(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Toggle habit completion for a date
 */
export function useToggleHabit(options?: {
  onSuccess?: (data: SuccessResponse<{ completed: boolean }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleHabitLog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: habitKeys.all });
      queryClient.invalidateQueries({ queryKey: habitKeys.heatmapAll });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Fetch heatmap data for a date range
 */
export function useHabitHeatmap(from: string, to: string) {
  return useQuery({
    queryKey: habitKeys.heatmap(from, to),
    queryFn: () => getHeatmap(from, to),
    staleTime: 60 * 1000,
    enabled: !!from && !!to,
  });
}

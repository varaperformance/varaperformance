import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  PersonalRecordResponse,
  PersonalRecordListData,
  CreatePersonalRecord,
  UpdatePersonalRecord,
  PersonalRecordQuery,
  PRType,
  UnitSystem,
} from '@varaperformance/core';
import {
  convertWeightFromStorage,
  convertDistanceFromStorage,
  getWeightUnit,
  getDistanceUnit,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  PersonalRecordResponse,
  PersonalRecordListData,
  CreatePersonalRecord,
  UpdatePersonalRecord,
  PRType,
} from '@varaperformance/core';

// Query keys
export const prKeys = {
  all: ['personal-records'] as const,
  lists: () => [...prKeys.all, 'list'] as const,
  list: (query?: PersonalRecordQuery) => [...prKeys.lists(), query] as const,
  byExercise: (exerciseId: string) =>
    [...prKeys.all, 'exercise', exerciseId] as const,
  detail: (id: string) => [...prKeys.all, 'detail', id] as const,
};

// API functions
const getPersonalRecords = async (query?: PersonalRecordQuery) => {
  const params = new URLSearchParams();
  if (query?.exerciseId) params.set('exerciseId', query.exerciseId);
  if (query?.type) params.set('type', query.type);

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<PersonalRecordListData>>(
    `personal-records${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getPersonalRecordsByExercise = async (exerciseId: string) => {
  const response = await api.get<SuccessResponse<PersonalRecordResponse[]>>(
    `personal-records/exercise/${exerciseId}`,
  );
  return response.data;
};

const getPersonalRecord = async (prId: string) => {
  const response = await api.get<SuccessResponse<PersonalRecordResponse>>(
    `personal-records/${prId}`,
  );
  return response.data;
};

const createPersonalRecord = async (data: CreatePersonalRecord) => {
  const response = await api.post<SuccessResponse<PersonalRecordResponse>>(
    'personal-records',
    data,
  );
  return response.data;
};

const updatePersonalRecord = async ({
  prId,
  data,
}: {
  prId: string;
  data: UpdatePersonalRecord;
}) => {
  const response = await api.patch<SuccessResponse<PersonalRecordResponse>>(
    `personal-records/${prId}`,
    data,
  );
  return response.data;
};

const deletePersonalRecord = async (prId: string) => {
  const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
    `personal-records/${prId}`,
  );
  return response.data;
};

// Hooks

/**
 * Get all personal records with optional filtering
 */
export function usePersonalRecords(
  query?: PersonalRecordQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: prKeys.list(query),
    queryFn: () => getPersonalRecords(query),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get PRs for a specific exercise
 */
export function useExercisePRs(exerciseId: string | undefined) {
  return useQuery({
    queryKey: prKeys.byExercise(exerciseId || ''),
    queryFn: () => getPersonalRecordsByExercise(exerciseId!),
    enabled: !!exerciseId,
  });
}

/**
 * Get a single personal record
 */
export function usePersonalRecord(prId: string | undefined) {
  return useQuery({
    queryKey: prKeys.detail(prId || ''),
    queryFn: () => getPersonalRecord(prId!),
    enabled: !!prId,
  });
}

/**
 * Create or update a personal record
 */
export function useCreatePersonalRecord(options?: {
  onSuccess?: (data: SuccessResponse<PersonalRecordResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPersonalRecord,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: prKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update a personal record
 */
export function useUpdatePersonalRecord(options?: {
  onSuccess?: (data: SuccessResponse<PersonalRecordResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePersonalRecord,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: prKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a personal record
 */
export function useDeletePersonalRecord(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePersonalRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

// Helper to format PR type for display
export const PR_TYPE_LABELS: Record<PRType, string> = {
  MAX_WEIGHT: 'Max Weight',
  MAX_REPS: 'Max Reps',
  MAX_VOLUME: 'Max Volume',
  BEST_PACE: 'Best Pace',
  LONGEST_DIST: 'Longest Distance',
  LONGEST_TIME: 'Longest Time',
};

// Helper to format PR value based on type (values stored in metric)
export function formatPRValue(
  type: PRType,
  value: number,
  unit: UnitSystem = 'metric',
): string {
  switch (type) {
    case 'MAX_WEIGHT': {
      const displayValue = convertWeightFromStorage(value, unit);
      return `${displayValue} ${getWeightUnit(unit)}`;
    }
    case 'MAX_REPS':
      return `${value} reps`;
    case 'MAX_VOLUME': {
      const displayValue = convertWeightFromStorage(value, unit);
      return `${Math.round(displayValue ?? 0)} ${getWeightUnit(unit)}×reps`;
    }
    case 'BEST_PACE': {
      // value is m/s, convert to displayable pace
      if (unit === 'imperial') {
        // Convert to min/mile
        const paceMinPerMile = 1609.344 / (value * 60);
        const paceMin = Math.floor(paceMinPerMile);
        const paceSec = Math.round((paceMinPerMile - paceMin) * 60);
        return `${paceMin}:${String(paceSec).padStart(2, '0')} /mi`;
      }
      // metric: min/km pace
      const paceMinPerKm = 1000 / (value * 60);
      const paceMin = Math.floor(paceMinPerKm);
      const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
      return `${paceMin}:${String(paceSec).padStart(2, '0')} /km`;
    }
    case 'LONGEST_DIST': {
      const displayValue = convertDistanceFromStorage(value, unit);
      return `${displayValue?.toFixed(2)} ${getDistanceUnit(unit)}`;
    }
    case 'LONGEST_TIME': {
      const hours = Math.floor(value / 3600);
      const mins = Math.floor((value % 3600) / 60);
      const secs = value % 60;
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      if (mins > 0) {
        return `${mins}m ${secs}s`;
      }
      return `${secs}s`;
    }
    default:
      return String(value);
  }
}

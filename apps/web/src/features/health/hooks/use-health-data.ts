import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  StepLogResponse,
  StepsTodayResponse,
  SleepLogResponse,
  HeartRateLogResponse,
  HeartRateDailySummary,
  SyncHealthDataResponse,
  HealthSyncStatusResponse,
  HealthSyncPreferenceResponse,
  UpdateHealthSyncPreference,
  SuccessResponse,
} from '@varaperformance/core';

// ─── Query keys ─────────────────────────────────────────────────────────────

export const healthDataKeys = {
  all: ['health-data'] as const,
  stepsToday: () => [...healthDataKeys.all, 'steps', 'today'] as const,
  stepsTrend: (from: string, to: string) =>
    [...healthDataKeys.all, 'steps', from, to] as const,
  sleepTrend: (from: string, to: string) =>
    [...healthDataKeys.all, 'sleep', from, to] as const,
  heartRate: (from: string, to: string) =>
    [...healthDataKeys.all, 'heart-rate', from, to] as const,
  heartRateDailySummary: (from: string, to: string) =>
    [...healthDataKeys.all, 'heart-rate', 'daily-summary', from, to] as const,
  syncStatus: () => [...healthDataKeys.all, 'sync-status'] as const,
  syncPreferences: () => [...healthDataKeys.all, 'sync-preferences'] as const,
};

// ─── Steps ──────────────────────────────────────────────────────────────────

export function useStepsToday(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: healthDataKeys.stepsToday(),
    queryFn: async () => {
      const { data } = await api.get<SuccessResponse<StepsTodayResponse>>(
        'health-data/steps/today',
      );
      return data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}

export function useStepsTrend(
  from: string,
  to: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: healthDataKeys.stepsTrend(from, to),
    queryFn: async () => {
      const { data } = await api.get<
        SuccessResponse<{
          days: Array<{ date: string; steps: number; sources: string[] }>;
        }>
      >('health-data/steps', { params: { from, to } });
      return data.data.days;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      steps: number;
      source?: string;
    }) => {
      const { data } = await api.post<SuccessResponse<StepLogResponse>>(
        'health-data/steps',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthDataKeys.stepsToday() });
      qc.invalidateQueries({ queryKey: ['health-data', 'steps'] });
    },
  });
}

export function useDeleteStepLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logId: string) => {
      const { data } = await api.delete<SuccessResponse<{ deleted: true }>>(
        `health-data/steps/${logId}`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthDataKeys.stepsToday() });
      qc.invalidateQueries({ queryKey: ['health-data', 'steps'] });
    },
  });
}

// ─── Sleep ──────────────────────────────────────────────────────────────────

export function useSleepTrend(
  from: string,
  to: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: healthDataKeys.sleepTrend(from, to),
    queryFn: async () => {
      const { data } = await api.get<
        SuccessResponse<{
          days: Array<{ date: string; duration: number; source: string }>;
        }>
      >('health-data/sleep', { params: { from, to } });
      return data.data.days;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      startTime: string;
      endTime: string;
      duration: number;
      source?: string;
    }) => {
      const { data } = await api.post<SuccessResponse<SleepLogResponse>>(
        'health-data/sleep',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-data', 'sleep'] });
    },
  });
}

// ─── Heart Rate ─────────────────────────────────────────────────────────────

export function useHeartRate(
  from: string,
  to: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: healthDataKeys.heartRate(from, to),
    queryFn: async () => {
      const { data } = await api.get<
        SuccessResponse<{ samples: HeartRateLogResponse[] }>
      >('health-data/heart-rate', { params: { from, to } });
      return data.data.samples;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHeartRateDailySummary(
  from: string,
  to: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: healthDataKeys.heartRateDailySummary(from, to),
    queryFn: async () => {
      const { data } = await api.get<
        SuccessResponse<{ days: HeartRateDailySummary[] }>
      >('health-data/heart-rate/daily-summary', { params: { from, to } });
      return data.data.days;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogHeartRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      samples: Array<{ timestamp: string; bpm: number; source?: string }>;
    }) => {
      const { data } = await api.post<SuccessResponse<{ inserted: number }>>(
        'health-data/heart-rate',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-data', 'heart-rate'] });
    },
  });
}

// ─── Bulk Sync ──────────────────────────────────────────────────────────────

export function useSyncHealthData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      source: string;
      steps?: Array<{ date: string; steps: number }>;
      sleep?: Array<{
        date: string;
        startTime: string;
        endTime: string;
        duration: number;
      }>;
      heartRate?: Array<{ timestamp: string; bpm: number }>;
    }) => {
      const { data } = await api.post<SuccessResponse<SyncHealthDataResponse>>(
        'health-data/sync',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthDataKeys.all });
    },
  });
}

// ─── Sync Status ────────────────────────────────────────────────────────────

export function useSyncStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: healthDataKeys.syncStatus(),
    queryFn: async () => {
      const { data } = await api.get<
        SuccessResponse<HealthSyncStatusResponse[]>
      >('health-data/sync/status');
      return data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}

// ─── Sync Preferences ───────────────────────────────────────────────────────

export function useSyncPreferences(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: healthDataKeys.syncPreferences(),
    queryFn: async () => {
      const { data } = await api.get<
        SuccessResponse<HealthSyncPreferenceResponse>
      >('health-data/sync/preferences');
      return data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSyncPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: UpdateHealthSyncPreference) => {
      const { data } = await api.put<
        SuccessResponse<HealthSyncPreferenceResponse>
      >('health-data/sync/preferences', prefs);
      return data.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(healthDataKeys.syncPreferences(), data);
    },
  });
}

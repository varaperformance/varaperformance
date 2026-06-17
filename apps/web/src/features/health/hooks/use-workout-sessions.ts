import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { writeWorkoutSession } from '@/lib/health-data';
import axios from 'axios';
import type {
  SuccessResponse,
  WorkoutSessionResponse,
  WorkoutSessionListData,
  WorkoutStats,
  CreateWorkoutSession,
  UpdateWorkoutSession,
  CreateWorkout,
  AddWorkoutSet,
  UpdateWorkoutSet,
  UpdateWorkoutInSession,
  WorkoutSessionQuery,
  CreateSessionResponse,
  StartSession,
  EndSession,
  ActiveSession,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  WorkoutSessionResponse,
  WorkoutSessionListData,
  WorkoutStats,
  CreateWorkoutSession,
  UpdateWorkoutSession,
  CreateWorkout,
  WorkoutResponse,
  WorkoutSet,
  CreateSessionResponse,
  NewPR,
  StartSession,
  EndSession,
  ActiveSession,
  UpdateWorkoutInSession,
} from '@varaperformance/core';

export const workoutSessionKeys = {
  all: ['workout-sessions'] as const,
  list: (query?: WorkoutSessionQuery) =>
    [...workoutSessionKeys.all, query] as const,
  detail: (sessionId: string) => ['workout-session', sessionId] as const,
  stats: () => ['workout-stats'] as const,
  frequentExercises: () => ['frequent-exercises'] as const,
  active: () => ['active-session'] as const,
  activity: (query: DateRangeQuery) => ['workout-activity', query] as const,
  muscleBreakdown: (query: DateRangeQuery) =>
    ['muscle-breakdown', query] as const,
  recentWorkouts: (options: RecentWorkoutsOptions) =>
    ['recent-workouts-v2', options] as const,
  motivationQuote: () => ['workout-motivation-quote'] as const,
  goal: () => ['workout-goal'] as const,
  goalDefaults: () => ['workout-goal-defaults'] as const,
};

// API functions
const getSessions = async (query?: WorkoutSessionQuery) => {
  const params = new URLSearchParams();

  if (query?.startDate) params.set('startDate', query.startDate);
  if (query?.endDate) params.set('endDate', query.endDate);
  if (query?.privacy) params.set('privacy', query.privacy);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<WorkoutSessionListData>>(
    `workout-sessions${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getSession = async (sessionId: string) => {
  const response = await api.get<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}`,
  );
  return response.data;
};

const getStats = async () => {
  const response = await api.get<SuccessResponse<WorkoutStats>>(
    'workout-sessions/stats',
  );
  return response.data;
};

const getFrequentExercises = async () => {
  const response = await api.get<SuccessResponse<{ exerciseIds: string[] }>>(
    'workout-sessions/frequent-exercises',
  );
  return response.data;
};

// Active session APIs
const getActiveSession = async () => {
  const response = await api.get<SuccessResponse<ActiveSession | null>>(
    'workout-sessions/active',
  );
  return response.data;
};

const startSession = async (data: StartSession) => {
  const response = await api.post<SuccessResponse<WorkoutSessionResponse>>(
    'workout-sessions/start',
    data,
  );
  return response.data;
};

const endSession = async ({
  sessionId,
  data,
}: {
  sessionId: string;
  data?: EndSession;
}) => {
  const response = await api.post<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}/end`,
    data || {},
  );
  return response.data;
};

const createSession = async (data: CreateWorkoutSession) => {
  const response = await api.post<SuccessResponse<CreateSessionResponse>>(
    'workout-sessions',
    data,
  );
  return response.data;
};

const updateSession = async ({
  sessionId,
  data,
}: {
  sessionId: string;
  data: UpdateWorkoutSession;
}) => {
  const response = await api.patch<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}`,
    data,
  );
  return response.data;
};

const deleteSession = async (sessionId: string) => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `workout-sessions/${sessionId}`,
  );
  return response.data;
};

const addWorkout = async ({
  sessionId,
  data,
}: {
  sessionId: string;
  data: CreateWorkout;
}) => {
  const response = await api.post<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}/workouts`,
    data,
  );
  return response.data;
};

const removeWorkout = async ({
  sessionId,
  workoutId,
}: {
  sessionId: string;
  workoutId: string;
}) => {
  const response = await api.delete<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}/workouts/${workoutId}`,
  );
  return response.data;
};

const addSet = async ({
  sessionId,
  workoutId,
  data,
}: {
  sessionId: string;
  workoutId: string;
  data: AddWorkoutSet;
}) => {
  const response = await api.post<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}/workouts/${workoutId}/sets`,
    data,
  );
  return response.data;
};

const updateSet = async ({
  sessionId,
  workoutId,
  setId,
  data,
}: {
  sessionId: string;
  workoutId: string;
  setId: string;
  data: UpdateWorkoutSet;
}) => {
  const response = await api.patch<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}/workouts/${workoutId}/sets/${setId}`,
    data,
  );
  return response.data;
};

const deleteSet = async ({
  sessionId,
  workoutId,
  setId,
}: {
  sessionId: string;
  workoutId: string;
  setId: string;
}) => {
  const response = await api.delete<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}/workouts/${workoutId}/sets/${setId}`,
  );
  return response.data;
};

const updateWorkout = async ({
  sessionId,
  workoutId,
  data,
}: {
  sessionId: string;
  workoutId: string;
  data: UpdateWorkoutInSession;
}) => {
  const response = await api.patch<SuccessResponse<WorkoutSessionResponse>>(
    `workout-sessions/${sessionId}/workouts/${workoutId}`,
    data,
  );
  return response.data;
};

const shouldRetryWorkoutQuery = (failureCount: number, error: Error) => {
  if (axios.isAxiosError(error) && error.response?.status === 429) {
    return false;
  }

  return failureCount < 2;
};

/**
 * Fetch workout sessions with optional filters
 */
export function useWorkoutSessions(
  query?: WorkoutSessionQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: workoutSessionKeys.list(query),
    queryFn: () => getSessions(query),
    staleTime: 30 * 1000, // 30 seconds
    retry: shouldRetryWorkoutQuery,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch a single workout session by ID
 */
export function useWorkoutSession(
  sessionId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: workoutSessionKeys.detail(sessionId),
    queryFn: () => getSession(sessionId),
    enabled: options?.enabled ?? !!sessionId,
    retry: shouldRetryWorkoutQuery,
  });
}

/**
 * Fetch workout stats
 */
export function useWorkoutStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workoutSessionKeys.stats(),
    queryFn: getStats,
    staleTime: 60 * 1000, // 1 minute
    retry: shouldRetryWorkoutQuery,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch user's frequently used exercise IDs
 */
export function useFrequentExercises() {
  return useQuery({
    queryKey: workoutSessionKeys.frequentExercises(),
    queryFn: getFrequentExercises,
    staleTime: 60 * 1000, // 1 minute
    retry: shouldRetryWorkoutQuery,
  });
}

/**
 * Fetch current active session (if any)
 */
export function useActiveSession() {
  return useQuery({
    queryKey: workoutSessionKeys.active(),
    queryFn: getActiveSession,
    staleTime: 30 * 1000, // 30 seconds
    retry: shouldRetryWorkoutQuery,
  });
}

/**
 * Start a new workout session
 */
export function useStartSession(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.active() });
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * End a workout session
 */
export function useEndSession(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endSession,
    onSuccess: (data) => {
      // Immediately set active session to null to update UI
      queryClient.setQueryData(workoutSessionKeys.active(), {
        success: true,
        data: null,
      });
      // Then invalidate to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.active(),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.all,
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.stats(),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({ queryKey: ['workout-session'] });
      queryClient.invalidateQueries({ queryKey: ['personal-records'] });

      // Export completed workout to HealthKit / Health Connect
      const session = data.data as WorkoutSessionResponse & {
        startedAt?: string;
        endedAt?: string | null;
      };
      if (session?.startedAt && session?.endedAt) {
        // Estimate calories from workout duration (rough: 6 cal/min)
        const durationMs =
          new Date(session.endedAt).getTime() -
          new Date(session.startedAt).getTime();
        const durationMin = durationMs / 60_000;
        const estCalories =
          durationMin > 0 ? Math.round(durationMin * 6) : undefined;

        void writeWorkoutSession({
          startDate: session.startedAt,
          endDate: session.endedAt,
          calories: estCalories,
        });
      }

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Create a new workout session
 */
export function useCreateSession(options?: {
  onSuccess?: (data: SuccessResponse<CreateSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['personal-records'] });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.frequentExercises(),
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update a workout session
 */
export function useUpdateSession(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.detail(data.data?.id),
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a workout session
 */
export function useDeleteSession(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.stats() });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Add a workout to a session
 */
export function useAddWorkout(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addWorkout,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.detail(data.data?.id),
      });
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.stats() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Remove a workout from a session
 */
export function useRemoveWorkout(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeWorkout,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.detail(data.data?.id),
      });
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.stats() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Add a set to a workout
 */
export function useAddSet(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addSet,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.detail(data.data?.id),
      });
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.stats() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update a workout set
 */
export function useUpdateSet(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSet,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.detail(data.data?.id),
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a workout set
 */
export function useDeleteSet(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSet,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.detail(data.data?.id),
      });
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.stats() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update a workout (e.g., mark as complete)
 */
export function useUpdateWorkout(options?: {
  onSuccess?: (data: SuccessResponse<WorkoutSessionResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWorkout,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.detail(data.data?.id),
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

// Types for new dashboard endpoints
export interface DailyActivity {
  date: string;
  workouts: number;
  sets: number;
  volume: number;
}

export interface ActivityData {
  items: DailyActivity[];
  startDate: string;
  endDate: string;
}

export interface MuscleBreakdownItem {
  muscleGroup: string;
  fullName: string;
  sets: number;
  workouts: number;
  percentage: number;
}

export interface MuscleBreakdownData {
  items: MuscleBreakdownItem[];
  totalSets: number;
  totalWorkouts: number;
}

export interface RecentWorkoutSummary {
  id: string;
  title: string | null;
  performed: string;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  exerciseNames: string[];
  duration: number | null;
  privacy: 'PRIVATE' | 'FRIENDS' | 'PUBLIC';
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
  days?: number;
}

export interface WorkoutMotivationQuote {
  quote: string;
  author: string;
  source: 'library' | 'fallback';
}

// API functions for new endpoints
const getActivityData = async (query: DateRangeQuery = {}) => {
  const params = new URLSearchParams();
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  if (query.days && !query.startDate) params.set('days', String(query.days));
  const queryString = params.toString();
  const response = await api.get<SuccessResponse<ActivityData>>(
    `workout-sessions/activity${queryString ? `?${queryString}` : '?days=365'}`,
  );
  return response.data;
};

const getMuscleBreakdown = async (query: DateRangeQuery = {}) => {
  const params = new URLSearchParams();
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  if (query.days && !query.startDate) params.set('days', String(query.days));
  const queryString = params.toString();
  const response = await api.get<SuccessResponse<MuscleBreakdownData>>(
    `workout-sessions/muscle-breakdown${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

interface RecentWorkoutsOptions {
  limit?: number;
  excludeShared?: boolean;
  shareableOnly?: boolean;
}

const getRecentWorkouts = async (options: RecentWorkoutsOptions = {}) => {
  const { limit = 5, excludeShared = false, shareableOnly = false } = options;
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (excludeShared) params.set('excludeShared', 'true');
  if (shareableOnly) params.set('shareableOnly', 'true');

  const response = await api.get<SuccessResponse<RecentWorkoutSummary[]>>(
    `workout-sessions/recent?${params.toString()}`,
  );
  return response.data;
};

const getMotivationQuote = async () => {
  const response = await api.get<SuccessResponse<WorkoutMotivationQuote>>(
    'workout-sessions/motivation-quote',
  );
  return response.data;
};

/**
 * Fetch daily activity data for calendar / heat map
 */
export function useActivityData(
  query: DateRangeQuery | number = 365,
  options?: { enabled?: boolean },
) {
  const normalizedQuery: DateRangeQuery =
    typeof query === 'number' ? { days: query } : query;

  return useQuery({
    queryKey: workoutSessionKeys.activity(normalizedQuery),
    queryFn: () => getActivityData(normalizedQuery),
    staleTime: 60 * 1000, // 1 minute
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch muscle group breakdown
 */
export function useMuscleBreakdown(
  query: DateRangeQuery | number = 90,
  options?: { enabled?: boolean },
) {
  const normalizedQuery: DateRangeQuery =
    typeof query === 'number' ? { days: query } : query;

  return useQuery({
    queryKey: workoutSessionKeys.muscleBreakdown(normalizedQuery),
    queryFn: () => getMuscleBreakdown(normalizedQuery),
    staleTime: 60 * 1000, // 1 minute
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch recent workouts summary
 * @param options - limit, excludeShared (for Elevate), shareableOnly (non-private)
 */
export function useRecentWorkouts(
  options: RecentWorkoutsOptions | number = 5,
  queryOptions?: { enabled?: boolean },
) {
  const normalizedOptions: RecentWorkoutsOptions =
    typeof options === 'number' ? { limit: options } : options;

  return useQuery({
    queryKey: workoutSessionKeys.recentWorkouts(normalizedOptions),
    queryFn: () => getRecentWorkouts(normalizedOptions),
    staleTime: 0, // Always refetch to get fresh privacy data
    enabled: queryOptions?.enabled ?? true,
  });
}

export function useWorkoutMotivationQuote(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workoutSessionKeys.motivationQuote(),
    queryFn: getMotivationQuote,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

// ---------- Workout Goal API ----------

interface WorkoutGoalResponse {
  id: string;
  weeklyWorkouts: number;
  muscleTargets: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

interface UpsertWorkoutGoal {
  weeklyWorkouts?: number;
  muscleTargets?: Record<string, number>;
}

const getWorkoutGoal = async () => {
  const response =
    await api.get<SuccessResponse<WorkoutGoalResponse | null>>('workout-goal');
  return response.data;
};

const getWorkoutGoalWithDefaults = async () => {
  const response = await api.get<SuccessResponse<WorkoutGoalResponse>>(
    'workout-goal/defaults',
  );
  return response.data;
};

const upsertWorkoutGoal = async (data: UpsertWorkoutGoal) => {
  const response = await api.post<SuccessResponse<WorkoutGoalResponse>>(
    'workout-goal',
    data,
  );
  return response.data;
};

/**
 * Fetch workout goal
 */
export function useWorkoutGoal() {
  return useQuery({
    queryKey: workoutSessionKeys.goal(),
    queryFn: getWorkoutGoal,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch workout goal with defaults if not set
 */
export function useWorkoutGoalWithDefaults(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workoutSessionKeys.goalDefaults(),
    queryFn: getWorkoutGoalWithDefaults,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Update workout goal mutation
 */
export function useUpdateWorkoutGoal(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertWorkoutGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.goal() });
      queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.goalDefaults(),
      });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

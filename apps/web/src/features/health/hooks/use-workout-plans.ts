import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  WorkoutPlanResponse,
  WorkoutPlanListData,
  WorkoutPlanAssignmentResponse,
  WorkoutPlanAssignmentListData,
  WorkoutPlanQuery,
  WorkoutPlanAssignmentQuery,
  CreateWorkoutPlan,
  UpdateWorkoutPlan,
  CreateWorkoutPlanDay,
  UpdateWorkoutPlanDay,
  CreateWorkoutPlanExercise,
  UpdateWorkoutPlanExercise,
  AssignWorkoutPlan,
  DayOfWeek,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  WorkoutPlanResponse,
  WorkoutPlanListData,
  WorkoutPlanListItem,
  WorkoutPlanAssignmentResponse,
  WorkoutPlanAssignmentListData,
  CreateWorkoutPlan,
  UpdateWorkoutPlan,
  CreateWorkoutPlanDay,
  UpdateWorkoutPlanDay,
  CreateWorkoutPlanExercise,
  UpdateWorkoutPlanExercise,
  AssignWorkoutPlan,
  DayOfWeek,
} from '@varaperformance/core';

export const workoutPlanKeys = {
  all: ['workout-plans'] as const,
  list: (query?: WorkoutPlanQuery) => [...workoutPlanKeys.all, query] as const,
  me: (query?: WorkoutPlanQuery) =>
    [...workoutPlanKeys.all, 'me', query] as const,
  detail: (planId: string | undefined) =>
    [...workoutPlanKeys.all, planId] as const,
  assignments: () => ['workout-plan-assignments'] as const,
  assignmentsList: (query?: WorkoutPlanAssignmentQuery) =>
    [...workoutPlanKeys.assignments(), 'me', query] as const,
  assignment: (id: string | undefined) =>
    [...workoutPlanKeys.assignments(), id] as const,
  coachPlans: (query?: WorkoutPlanQuery) =>
    ['coach-workout-plans', query] as const,
  coachAssignments: (query?: WorkoutPlanAssignmentQuery) =>
    ['coach-workout-plan-assignments', query] as const,
};

// ============================================
// API Functions - Workout Plans
// ============================================

const getPlans = async (query?: WorkoutPlanQuery) => {
  const params = new URLSearchParams();
  if (query?.visibility) params.set('visibility', query.visibility);
  if (query?.difficulty) params.set('difficulty', query.difficulty);
  if (query?.search) params.set('search', query.search);
  if (query?.coachOnly) params.set('coachOnly', String(query.coachOnly));
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<WorkoutPlanListData>>(
    `workout-plans${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getMyPlans = async (query?: WorkoutPlanQuery) => {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<WorkoutPlanListData>>(
    `workout-plans/me${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getPlan = async (planId: string) => {
  const response = await api.get<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}`,
  );
  return response.data;
};

const createPlan = async (data: CreateWorkoutPlan) => {
  const response = await api.post<SuccessResponse<WorkoutPlanResponse>>(
    'workout-plans',
    data,
  );
  return response.data;
};

const updatePlan = async ({
  planId,
  data,
}: {
  planId: string;
  data: UpdateWorkoutPlan;
}) => {
  const response = await api.patch<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}`,
    data,
  );
  return response.data;
};

const deletePlan = async (planId: string) => {
  const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
    `workout-plans/${planId}`,
  );
  return response.data;
};

const copyPlan = async (planId: string) => {
  const response = await api.post<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/copy`,
  );
  return response.data;
};

const followPlan = async (planId: string) => {
  const response = await api.post<
    SuccessResponse<WorkoutPlanAssignmentResponse>
  >(`workout-plans/${planId}/follow`);
  return response.data;
};

// Day management
const addDay = async ({
  planId,
  data,
}: {
  planId: string;
  data: CreateWorkoutPlanDay;
}) => {
  const response = await api.post<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days`,
    data,
  );
  return response.data;
};

const updateDay = async ({
  planId,
  dayId,
  data,
}: {
  planId: string;
  dayId: string;
  data: UpdateWorkoutPlanDay;
}) => {
  const response = await api.patch<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days/${dayId}`,
    data,
  );
  return response.data;
};

const deleteDay = async ({
  planId,
  dayId,
}: {
  planId: string;
  dayId: string;
}) => {
  const response = await api.delete<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days/${dayId}`,
  );
  return response.data;
};

// Exercise management
const addExercise = async ({
  planId,
  dayId,
  data,
}: {
  planId: string;
  dayId: string;
  data: CreateWorkoutPlanExercise;
}) => {
  const response = await api.post<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days/${dayId}/exercises`,
    data,
  );
  return response.data;
};

const updateExercise = async ({
  planId,
  dayId,
  exerciseId,
  data,
}: {
  planId: string;
  dayId: string;
  exerciseId: string;
  data: UpdateWorkoutPlanExercise;
}) => {
  const response = await api.patch<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days/${dayId}/exercises/${exerciseId}`,
    data,
  );
  return response.data;
};

const deleteExercise = async ({
  planId,
  dayId,
  exerciseId,
}: {
  planId: string;
  dayId: string;
  exerciseId: string;
}) => {
  const response = await api.delete<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days/${dayId}/exercises/${exerciseId}`,
  );
  return response.data;
};

// Set management
const addSet = async ({
  planId,
  dayId,
  exerciseId,
  data,
}: {
  planId: string;
  dayId: string;
  exerciseId: string;
  data: {
    setNumber: number;
    targetReps?: number;
    targetWeight?: number;
    targetRpe?: number;
    targetDuration?: number;
    restAfter?: number;
    setType?: string;
    notes?: string;
  };
}) => {
  const response = await api.post<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days/${dayId}/exercises/${exerciseId}/sets`,
    data,
  );
  return response.data;
};

const updateSet = async ({
  planId,
  dayId,
  exerciseId,
  setId,
  data,
}: {
  planId: string;
  dayId: string;
  exerciseId: string;
  setId: string;
  data: {
    targetReps?: number | null;
    targetWeight?: number | null;
    targetRpe?: number | null;
    targetDuration?: number | null;
    restAfter?: number | null;
    setType?: string | null;
    notes?: string | null;
  };
}) => {
  const response = await api.patch<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days/${dayId}/exercises/${exerciseId}/sets/${setId}`,
    data,
  );
  return response.data;
};

const deleteSet = async ({
  planId,
  dayId,
  exerciseId,
  setId,
}: {
  planId: string;
  dayId: string;
  exerciseId: string;
  setId: string;
}) => {
  const response = await api.delete<SuccessResponse<WorkoutPlanResponse>>(
    `workout-plans/${planId}/days/${dayId}/exercises/${exerciseId}/sets/${setId}`,
  );
  return response.data;
};

// ============================================
// API Functions - Assignments
// ============================================

const getMyAssignments = async (query?: WorkoutPlanAssignmentQuery) => {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const response = await api.get<
    SuccessResponse<WorkoutPlanAssignmentListData>
  >(`workout-plans/me/assignments${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

const getAssignment = async (assignmentId: string) => {
  const response = await api.get<
    SuccessResponse<WorkoutPlanAssignmentResponse>
  >(`workout-plans/assignments/${assignmentId}`);
  return response.data;
};

const updateAssignmentStatus = async ({
  assignmentId,
  status,
}: {
  assignmentId: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}) => {
  const response = await api.patch<
    SuccessResponse<WorkoutPlanAssignmentResponse>
  >(`workout-plans/assignments/${assignmentId}/status`, { status });
  return response.data;
};

// ============================================
// API Functions - Start Workout from Plan
// ============================================

interface StartPlanWorkoutResponse {
  sessionId: string;
  dayId: string;
  exercises: Array<{
    exerciseId: string;
    name: string;
    category: string;
    sets: number[];
  }>;
}

const startPlanWorkout = async (data: {
  assignmentId: string;
  dayOfWeek: DayOfWeek;
  gymId?: string;
}) => {
  const response = await api.post<SuccessResponse<StartPlanWorkoutResponse>>(
    'workout-plans/start-workout',
    data,
  );
  return response.data;
};

const completePlanDay = async (data: {
  assignmentId: string;
  dayOfWeek: DayOfWeek;
  sessionId: string;
}) => {
  const response = await api.post<SuccessResponse<{ completedDayId: string }>>(
    'workout-plans/complete-day',
    data,
  );
  return response.data;
};

// ============================================
// API Functions - Coach
// ============================================

const getCoachPlans = async (query?: WorkoutPlanQuery) => {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<WorkoutPlanListData>>(
    `coaches/me/workout-plans${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const createCoachPlan = async (data: CreateWorkoutPlan) => {
  const response = await api.post<SuccessResponse<WorkoutPlanResponse>>(
    'coaches/me/workout-plans',
    data,
  );
  return response.data;
};

const assignPlan = async (data: AssignWorkoutPlan) => {
  const response = await api.post<
    SuccessResponse<WorkoutPlanAssignmentResponse>
  >('coaches/me/workout-plans/assign', data);
  return response.data;
};

const getCoachAssignments = async (query?: WorkoutPlanAssignmentQuery) => {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const response = await api.get<
    SuccessResponse<WorkoutPlanAssignmentListData>
  >(
    `coaches/me/workout-plans/assignments${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

// ============================================
// Query Hooks
// ============================================

export function useWorkoutPlans(query?: WorkoutPlanQuery) {
  return useQuery({
    queryKey: workoutPlanKeys.list(query),
    queryFn: () => getPlans(query),
  });
}

export function useMyWorkoutPlans(query?: WorkoutPlanQuery) {
  return useQuery({
    queryKey: workoutPlanKeys.me(query),
    queryFn: () => getMyPlans(query),
  });
}

export function useWorkoutPlan(planId: string | undefined) {
  return useQuery({
    queryKey: workoutPlanKeys.detail(planId),
    queryFn: () => getPlan(planId!),
    enabled: !!planId,
  });
}

export function useMyAssignments(query?: WorkoutPlanAssignmentQuery) {
  return useQuery({
    queryKey: workoutPlanKeys.assignmentsList(query),
    queryFn: () => getMyAssignments(query),
  });
}

export function useAssignment(assignmentId: string | undefined) {
  return useQuery({
    queryKey: workoutPlanKeys.assignment(assignmentId),
    queryFn: () => getAssignment(assignmentId!),
    enabled: !!assignmentId,
  });
}

// Coach hooks
export function useCoachWorkoutPlans(query?: WorkoutPlanQuery) {
  return useQuery({
    queryKey: workoutPlanKeys.coachPlans(query),
    queryFn: () => getCoachPlans(query),
  });
}

export function useCoachAssignments(query?: WorkoutPlanAssignmentQuery) {
  return useQuery({
    queryKey: workoutPlanKeys.coachAssignments(query),
    queryFn: () => getCoachAssignments(query),
  });
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.all });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlan,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.all });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.all });
    },
  });
}

export function useCopyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: copyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.all });
    },
  });
}

export function useFollowPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: followPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.assignments(),
      });
    },
  });
}

export function useUnfollowPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      updateAssignmentStatus({ assignmentId, status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.assignments(),
      });
    },
  });
}

export function useAddDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addDay,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

export function useUpdateDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDay,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

export function useDeleteDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDay,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

export function useAddExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addExercise,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateExercise,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExercise,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

// Set mutations
export function useAddSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addSet,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

export function useUpdateSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSet,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSet,
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(planId),
      });
    },
  });
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAssignmentStatus,
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.assignment(assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.assignments(),
      });
    },
  });
}

export function useStartPlanWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startPlanWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
    },
  });
}

export function useCompletePlanDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completePlanDay,
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.assignment(assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.assignments(),
      });
    },
  });
}

// Coach mutations
export function useCreateCoachPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCoachPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-workout-plans'] });
    },
  });
}

export function useAssignPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['coach-workout-plan-assignments'],
      });
    },
  });
}

// ============================================
// Utility
// ============================================

export const DAY_LABELS: Record<DayOfWeek, string> = {
  SUNDAY: 'Sunday',
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
};

export const DAYS_ORDERED: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

export const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const VISIBILITY_LABELS: Record<string, string> = {
  PRIVATE: 'Private',
  CLIENTS: 'Clients Only',
  PUBLIC: 'Public',
};

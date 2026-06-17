import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  MealPlanResponse,
  MealPlanListItem,
  MealPlanItemResponse,
  FoodLogResponse,
  CreateMealPlan,
  UpdateMealPlan,
  CreateMealPlanItem,
  UpdateMealPlanItem,
  CopyMealPlanDay,
  QuickLogMealPlan,
  GenerateFromMacros,
} from '@varaperformance/core';

export type { MealPlanResponse, MealPlanListItem, MealPlanItemResponse };

export const mealPlanKeys = {
  all: ['meal-plans'] as const,
  lists: () => [...mealPlanKeys.all] as const,
  active: () => [...mealPlanKeys.all, 'active'] as const,
  detail: (id: string) => [...mealPlanKeys.all, id] as const,
};

// ==================== API FUNCTIONS ====================

const getMealPlans = async (): Promise<SuccessResponse<MealPlanListItem[]>> => {
  const response =
    await api.get<SuccessResponse<MealPlanListItem[]>>('meal-plans');
  return response.data;
};

const getActiveMealPlan = async (): Promise<
  SuccessResponse<MealPlanResponse | null>
> => {
  const response =
    await api.get<SuccessResponse<MealPlanResponse | null>>(
      'meal-plans/active',
    );
  return response.data;
};

const getMealPlan = async (
  id: string,
): Promise<SuccessResponse<MealPlanResponse>> => {
  const response = await api.get<SuccessResponse<MealPlanResponse>>(
    `meal-plans/${id}`,
  );
  return response.data;
};

const createMealPlan = async (
  data: CreateMealPlan,
): Promise<SuccessResponse<MealPlanResponse>> => {
  const response = await api.post<SuccessResponse<MealPlanResponse>>(
    'meal-plans',
    data,
  );
  return response.data;
};

const updateMealPlan = async (
  id: string,
  data: UpdateMealPlan,
): Promise<SuccessResponse<MealPlanResponse>> => {
  const response = await api.put<SuccessResponse<MealPlanResponse>>(
    `meal-plans/${id}`,
    data,
  );
  return response.data;
};

const deleteMealPlan = async (
  id: string,
): Promise<SuccessResponse<{ message: string }>> => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `meal-plans/${id}`,
  );
  return response.data;
};

const addMealPlanItem = async (
  planId: string,
  data: CreateMealPlanItem,
): Promise<SuccessResponse<MealPlanItemResponse>> => {
  const response = await api.post<SuccessResponse<MealPlanItemResponse>>(
    `meal-plans/${planId}/items`,
    data,
  );
  return response.data;
};

const updateMealPlanItem = async (
  planId: string,
  itemId: string,
  data: UpdateMealPlanItem,
): Promise<SuccessResponse<MealPlanItemResponse>> => {
  const response = await api.put<SuccessResponse<MealPlanItemResponse>>(
    `meal-plans/${planId}/items/${itemId}`,
    data,
  );
  return response.data;
};

const removeMealPlanItem = async (
  planId: string,
  itemId: string,
): Promise<SuccessResponse<{ message: string }>> => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `meal-plans/${planId}/items/${itemId}`,
  );
  return response.data;
};

const copyMealPlanDay = async (
  planId: string,
  data: CopyMealPlanDay,
): Promise<SuccessResponse<MealPlanResponse>> => {
  const response = await api.post<SuccessResponse<MealPlanResponse>>(
    `meal-plans/${planId}/copy-day`,
    data,
  );
  return response.data;
};

const quickLogMealPlan = async (
  planId: string,
  data: QuickLogMealPlan,
): Promise<SuccessResponse<FoodLogResponse[]>> => {
  const response = await api.post<SuccessResponse<FoodLogResponse[]>>(
    `meal-plans/${planId}/quick-log`,
    data,
  );
  return response.data;
};

const generateFromMacros = async (
  data: GenerateFromMacros,
): Promise<SuccessResponse<MealPlanResponse>> => {
  const response = await api.post<SuccessResponse<MealPlanResponse>>(
    'meal-plans/generate',
    data,
  );
  return response.data;
};

// ==================== QUERY HOOKS ====================

export function useMealPlans() {
  return useQuery({
    queryKey: mealPlanKeys.lists(),
    queryFn: getMealPlans,
    staleTime: 60 * 1000,
  });
}

export function useActiveMealPlan(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mealPlanKeys.active(),
    queryFn: getActiveMealPlan,
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useMealPlan(id: string, enabled = true) {
  return useQuery({
    queryKey: mealPlanKeys.detail(id),
    queryFn: () => getMealPlan(id),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

// ==================== MUTATION HOOKS ====================

export function useCreateMealPlan(options?: {
  onSuccess?: (data: SuccessResponse<MealPlanResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMealPlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUpdateMealPlan(options?: {
  onSuccess?: (data: SuccessResponse<MealPlanResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMealPlan }) =>
      updateMealPlan(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDeleteMealPlan(options?: {
  onSuccess?: (data: SuccessResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMealPlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useAddMealPlanItem(options?: {
  onSuccess?: (data: SuccessResponse<MealPlanItemResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      data,
    }: {
      planId: string;
      data: CreateMealPlanItem;
    }) => addMealPlanItem(planId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUpdateMealPlanItem(options?: {
  onSuccess?: (data: SuccessResponse<MealPlanItemResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      itemId,
      data,
    }: {
      planId: string;
      itemId: string;
      data: UpdateMealPlanItem;
    }) => updateMealPlanItem(planId, itemId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useRemoveMealPlanItem(options?: {
  onSuccess?: (data: SuccessResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, itemId }: { planId: string; itemId: string }) =>
      removeMealPlanItem(planId, itemId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useCopyMealPlanDay(options?: {
  onSuccess?: (data: SuccessResponse<MealPlanResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: CopyMealPlanDay }) =>
      copyMealPlanDay(planId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useQuickLogMealPlan(options?: {
  onSuccess?: (data: SuccessResponse<FoodLogResponse[]>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      data,
    }: {
      planId: string;
      data: QuickLogMealPlan;
    }) => quickLogMealPlan(planId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'diary'] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useGenerateFromMacros(options?: {
  onSuccess?: (data: SuccessResponse<MealPlanResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateFromMacros,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

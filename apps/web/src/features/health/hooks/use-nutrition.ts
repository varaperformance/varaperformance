import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  FoodListItem,
  FoodResponse,
  FoodLogResponse,
  FoodSearchResult,
  DailyNutritionSummary,
  NutritionGoalResponse,
  FavoriteFoodResponse,
  RecentFoodResponse,
  CreateFood,
  UpdateFood,
  CreateFoodLog,
  UpdateFoodLog,
  UpdateNutritionGoal,
  AddFavoriteFood,
  MealType,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  FoodListItem,
  FoodResponse,
  FoodLogResponse,
  FoodSearchResult,
  DailyNutritionSummary,
  NutritionGoalResponse,
  FavoriteFoodResponse,
  RecentFoodResponse,
  MealType,
};

export const foodKeys = {
  all: ['foods'] as const,
  search: (query: string, page: number, limit: number) =>
    [...foodKeys.all, 'search', query, page, limit] as const,
  searchInfinite: (query: string, limit: number) =>
    [...foodKeys.all, 'search', 'infinite', query, limit] as const,
  barcode: (barcode: string) => [...foodKeys.all, 'barcode', barcode] as const,
  detail: (id: string) => [...foodKeys.all, id] as const,
};

export const nutritionKeys = {
  all: ['nutrition'] as const,
  diary: (date?: string) => [...nutritionKeys.all, 'diary', date] as const,
  history: (startDate: string, endDate: string) =>
    [...nutritionKeys.all, 'history', startDate, endDate] as const,
  goal: () => [...nutritionKeys.all, 'goal'] as const,
  favorites: () => [...nutritionKeys.all, 'favorites'] as const,
  recent: (limit: number) => [...nutritionKeys.all, 'recent', limit] as const,
};

// ==================== API FUNCTIONS ====================

// Food search
const searchFoods = async (
  query: string,
  page = 1,
  limit = 20,
  signal?: AbortSignal,
): Promise<SuccessResponse<FoodSearchResult>> => {
  const params = new URLSearchParams({
    query,
    page: String(page),
    limit: String(limit),
  });
  const response = await api.get<SuccessResponse<FoodSearchResult>>(
    `nutrition/foods/search?${params}`,
    { signal },
  );
  return response.data;
};

const searchByBarcode = async (
  barcode: string,
): Promise<SuccessResponse<FoodListItem | null>> => {
  const response = await api.get<SuccessResponse<FoodListItem | null>>(
    `nutrition/foods/barcode/${barcode}`,
  );
  return response.data;
};

const getFoodById = async (
  id: string,
): Promise<SuccessResponse<FoodResponse>> => {
  const response = await api.get<SuccessResponse<FoodResponse>>(
    `nutrition/foods/${id}`,
  );
  return response.data;
};

const createFood = async (
  data: CreateFood,
): Promise<SuccessResponse<FoodResponse>> => {
  const response = await api.post<SuccessResponse<FoodResponse>>(
    'nutrition/foods',
    data,
  );
  return response.data;
};

const updateFood = async (
  id: string,
  data: UpdateFood,
): Promise<SuccessResponse<FoodResponse>> => {
  const response = await api.put<SuccessResponse<FoodResponse>>(
    `nutrition/foods/${id}`,
    data,
  );
  return response.data;
};

const deleteFood = async (
  id: string,
): Promise<SuccessResponse<{ message: string }>> => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `nutrition/foods/${id}`,
  );
  return response.data;
};

// Food diary
const getDailySummary = async (
  date?: string,
): Promise<SuccessResponse<DailyNutritionSummary>> => {
  const params = date ? `?date=${date}` : '';
  const response = await api.get<SuccessResponse<DailyNutritionSummary>>(
    `nutrition/diary${params}`,
  );
  return response.data;
};

export interface NutritionHistoryDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const getNutritionHistory = async (startDate: string, endDate: string) => {
  const response = await api.get<
    SuccessResponse<{ days: NutritionHistoryDay[] }>
  >(`nutrition/diary/history?startDate=${startDate}&endDate=${endDate}`);
  return response.data;
};

const logFood = async (
  data: CreateFoodLog,
): Promise<SuccessResponse<FoodLogResponse>> => {
  const response = await api.post<SuccessResponse<FoodLogResponse>>(
    'nutrition/diary',
    data,
  );
  return response.data;
};

const updateFoodLog = async (
  id: string,
  data: UpdateFoodLog,
): Promise<SuccessResponse<FoodLogResponse>> => {
  const response = await api.put<SuccessResponse<FoodLogResponse>>(
    `nutrition/diary/${id}`,
    data,
  );
  return response.data;
};

const deleteFoodLog = async (
  id: string,
): Promise<SuccessResponse<{ message: string }>> => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `nutrition/diary/${id}`,
  );
  return response.data;
};

// Nutrition goal
const getNutritionGoal = async (): Promise<
  SuccessResponse<NutritionGoalResponse>
> => {
  const response =
    await api.get<SuccessResponse<NutritionGoalResponse>>('nutrition/goal');
  return response.data;
};

const updateNutritionGoal = async (
  data: UpdateNutritionGoal,
): Promise<SuccessResponse<NutritionGoalResponse>> => {
  const response = await api.put<SuccessResponse<NutritionGoalResponse>>(
    'nutrition/goal',
    data,
  );
  return response.data;
};

// Favorites
const getFavorites = async (): Promise<
  SuccessResponse<FavoriteFoodResponse[]>
> => {
  const response = await api.get<SuccessResponse<FavoriteFoodResponse[]>>(
    'nutrition/favorites',
  );
  return response.data;
};

const addFavorite = async (
  data: AddFavoriteFood,
): Promise<SuccessResponse<FavoriteFoodResponse>> => {
  const response = await api.post<SuccessResponse<FavoriteFoodResponse>>(
    'nutrition/favorites',
    data,
  );
  return response.data;
};

const removeFavorite = async (
  foodId: string,
): Promise<SuccessResponse<{ message: string }>> => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `nutrition/favorites/${foodId}`,
  );
  return response.data;
};

// Recent foods
const getRecentFoods = async (
  limit = 10,
): Promise<SuccessResponse<RecentFoodResponse[]>> => {
  const response = await api.get<SuccessResponse<RecentFoodResponse[]>>(
    `nutrition/recent?limit=${limit}`,
  );
  return response.data;
};

// ==================== QUERY HOOKS ====================

/**
 * Search foods by query
 */
export function useSearchFoods(
  query: string,
  page = 1,
  limit = 20,
  enabled = true,
) {
  return useQuery({
    queryKey: foodKeys.search(query, page, limit),
    queryFn: ({ signal }) => searchFoods(query, page, limit, signal),
    enabled: enabled && query.length >= 3,
    staleTime: 30 * 1000,
  });
}

/**
 * Infinite scrolling food search
 */
export function useInfiniteSearchFoods(
  query: string,
  limit = 20,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: foodKeys.searchInfinite(query, limit),
    queryFn: ({ pageParam = 1, signal }) =>
      searchFoods(query, pageParam, limit, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage.data?.hasMore) return undefined;
      return lastPageParam + 1;
    },
    enabled: enabled && query.length >= 3,
    staleTime: 30 * 1000,
  });
}

/**
 * Search food by barcode
 */
export function useSearchByBarcode(barcode: string, enabled = true) {
  return useQuery({
    queryKey: foodKeys.barcode(barcode),
    queryFn: () => searchByBarcode(barcode),
    enabled: enabled && barcode.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get single food by ID
 */
export function useFood(id: string, enabled = true) {
  return useQuery({
    queryKey: foodKeys.detail(id),
    queryFn: () => getFoodById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get daily nutrition summary
 */
export function useDailyNutritionSummary(
  date?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: nutritionKeys.diary(date),
    queryFn: () => getDailySummary(date),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get daily nutrition totals over a date range (for trend charts)
 */
export function useNutritionHistory(
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean },
) {
  const datesOk = !!startDate && !!endDate;
  return useQuery({
    queryKey: nutritionKeys.history(startDate, endDate),
    queryFn: () => getNutritionHistory(startDate, endDate),
    enabled: datesOk && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

/**
 * Get nutrition goal
 */
export function useNutritionGoal() {
  return useQuery({
    queryKey: nutritionKeys.goal(),
    queryFn: getNutritionGoal,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get favorite foods
 */
export function useFavorites() {
  return useQuery({
    queryKey: nutritionKeys.favorites(),
    queryFn: getFavorites,
    staleTime: 60 * 1000,
  });
}

/**
 * Get recent foods
 */
export function useRecentFoods(limit = 10) {
  return useQuery({
    queryKey: nutritionKeys.recent(limit),
    queryFn: () => getRecentFoods(limit),
    staleTime: 60 * 1000,
  });
}

// ==================== MUTATION HOOKS ====================

/**
 * Create custom food
 */
export function useCreateFood(options?: {
  onSuccess?: (data: SuccessResponse<FoodResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFood,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: foodKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update food
 */
export function useUpdateFood(options?: {
  onSuccess?: (data: SuccessResponse<FoodResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFood }) =>
      updateFood(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: foodKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete food
 */
export function useDeleteFood(options?: {
  onSuccess?: (data: SuccessResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFood,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: foodKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Log food entry
 */
export function useLogFood(options?: {
  onSuccess?: (data: SuccessResponse<FoodLogResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logFood,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() });
      queryClient.invalidateQueries({
        queryKey: [...nutritionKeys.all, 'recent'],
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update food log entry
 */
export function useUpdateFoodLog(options?: {
  onSuccess?: (data: SuccessResponse<FoodLogResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFoodLog }) =>
      updateFoodLog(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete food log entry
 */
export function useDeleteFoodLog(options?: {
  onSuccess?: (data: SuccessResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFoodLog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update nutrition goal
 */
export function useUpdateNutritionGoal(options?: {
  onSuccess?: (data: SuccessResponse<NutritionGoalResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNutritionGoal,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.goal() });
      queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Add favorite food
 */
export function useAddFavorite(options?: {
  onSuccess?: (data: SuccessResponse<FavoriteFoodResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addFavorite,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.favorites() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Remove favorite food
 */
export function useRemoveFavorite(options?: {
  onSuccess?: (data: SuccessResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFavorite,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.favorites() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

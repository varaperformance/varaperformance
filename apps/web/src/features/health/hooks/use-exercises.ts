import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  ExerciseResponse,
  ExerciseListData,
  ExerciseFilters,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  ExerciseResponse,
  ExerciseListData,
  ExerciseFilters,
  ExerciseCategory,
  MuscleGroup,
  Equipment,
  ExerciseDifficulty,
} from '@varaperformance/core';

export const exerciseKeys = {
  all: ['exercises'] as const,
  list: (filters?: ExerciseFilters) => [...exerciseKeys.all, filters] as const,
  detail: (slug: string) => ['exercise', slug] as const,
};

// API functions
const getExercises = async (filters?: ExerciseFilters) => {
  const params = new URLSearchParams();

  if (filters?.category) params.set('category', filters.category);
  if (filters?.muscleGroup) params.set('muscleGroup', filters.muscleGroup);
  if (filters?.equipment) params.set('equipment', filters.equipment);
  if (filters?.difficulty) params.set('difficulty', filters.difficulty);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<ExerciseListData>>(
    `exercises${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getExerciseBySlug = async (slug: string) => {
  const response = await api.get<SuccessResponse<ExerciseResponse>>(
    `exercises/slug/${slug}`,
  );
  return response.data;
};

/**
 * Fetch exercises with optional filters
 */
export function useExercises(filters?: ExerciseFilters) {
  const hasShortSearch = !!filters?.search && filters.search.length < 3;
  return useQuery({
    queryKey: exerciseKeys.list(filters),
    queryFn: () => getExercises(filters),
    enabled: !hasShortSearch,
    staleTime: 5 * 60 * 1000, // 5 minutes - exercises don't change often
  });
}

/**
 * Fetch a single exercise by slug
 */
export function useExercise(slug: string) {
  return useQuery({
    queryKey: exerciseKeys.detail(slug),
    queryFn: () => getExerciseBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  CreateRecipe,
  LogRecipe,
  MealType,
  RecipeCategoryResponse,
  RecipeResponse,
  RecipeSearchResult,
  SearchRecipes,
  SuccessResponse,
  UpdateRecipe,
} from '@varaperformance/core';

export type {
  RecipeCategoryResponse,
  RecipeResponse,
  RecipeSearchResult,
  MealType,
};

export const recipeKeys = {
  all: ['recipes'] as const,
  search: (query: SearchRecipes) =>
    [...recipeKeys.all, 'search', query] as const,
  detail: (id: string) => [...recipeKeys.all, 'detail', id] as const,
  categories: () => ['recipe-categories'] as const,
};

const searchRecipes = async (
  query: SearchRecipes,
): Promise<SuccessResponse<RecipeSearchResult>> => {
  const params = new URLSearchParams();

  if (query.query) params.set('query', query.query);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.mine !== undefined) params.set('mine', String(query.mine));
  if (query.saved !== undefined) params.set('saved', String(query.saved));
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.sort) params.set('sort', query.sort);
  if (query.seed !== undefined) params.set('seed', String(query.seed));

  const response = await api.get<SuccessResponse<RecipeSearchResult>>(
    `recipes?${params.toString()}`,
  );
  return response.data;
};

const getRecipe = async (
  id: string,
): Promise<SuccessResponse<RecipeResponse>> => {
  const response = await api.get<SuccessResponse<RecipeResponse>>(
    `recipes/${id}`,
  );
  return response.data;
};

const createRecipe = async (
  data: CreateRecipe,
): Promise<SuccessResponse<RecipeResponse>> => {
  const response = await api.post<SuccessResponse<RecipeResponse>>(
    'recipes',
    data,
  );
  return response.data;
};

const updateRecipe = async (
  id: string,
  data: UpdateRecipe,
): Promise<SuccessResponse<RecipeResponse>> => {
  const response = await api.patch<SuccessResponse<RecipeResponse>>(
    `recipes/${id}`,
    data,
  );
  return response.data;
};

const deleteRecipe = async (
  id: string,
): Promise<SuccessResponse<{ deleted: true }>> => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `recipes/${id}`,
  );
  return response.data;
};

const saveRecipe = async (
  id: string,
): Promise<SuccessResponse<{ saved: true }>> => {
  const response = await api.post<SuccessResponse<{ saved: true }>>(
    `recipes/${id}/save`,
  );
  return response.data;
};

const unsaveRecipe = async (
  id: string,
): Promise<SuccessResponse<{ deleted: true }>> => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `recipes/${id}/save`,
  );
  return response.data;
};

const logRecipeToDiary = async (
  id: string,
  data: LogRecipe,
): Promise<SuccessResponse<{ id: string }>> => {
  const response = await api.post<SuccessResponse<{ id: string }>>(
    `recipes/${id}/log`,
    data,
  );
  return response.data;
};

const uploadRecipeImage = async (
  file: File,
): Promise<SuccessResponse<{ url: string }>> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<SuccessResponse<{ url: string }>>(
    'recipes/upload-image',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );

  return response.data;
};

export function useSearchRecipes(query: SearchRecipes) {
  return useQuery({
    queryKey: recipeKeys.search(query),
    queryFn: () => searchRecipes(query),
    staleTime: 30 * 1000,
  });
}

export function useRecipe(id: string, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => getRecipe(id),
    enabled: enabled && !!id,
    staleTime: 30 * 1000,
  });
}

export function useRecipeCategories() {
  return useQuery({
    queryKey: recipeKeys.categories(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{
          items: RecipeCategoryResponse[];
          total: number;
          page: number;
          limit: number;
        }>
      >('recipe-categories?limit=100');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRecipe(options?: {
  onSuccess?: (data: SuccessResponse<RecipeResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRecipe,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUpdateRecipe(options?: {
  onSuccess?: (data: SuccessResponse<RecipeResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecipe }) =>
      updateRecipe(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDeleteRecipe(options?: {
  onSuccess?: (data: SuccessResponse<{ deleted: true }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRecipe,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useSaveRecipe(options?: {
  onSuccess?: (data: SuccessResponse<{ saved: true }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveRecipe,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUnsaveRecipe(options?: {
  onSuccess?: (data: SuccessResponse<{ deleted: true }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unsaveRecipe,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useLogRecipeToDiary(options?: {
  onSuccess?: (data: SuccessResponse<{ id: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LogRecipe }) =>
      logRecipeToDiary(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'diary'] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUploadRecipeImage(options?: {
  onSuccess?: (data: SuccessResponse<{ url: string }>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: uploadRecipeImage,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

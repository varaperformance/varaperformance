import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  GroceryListDetailResponse,
  GroceryListSummary,
  GroceryListItemResponse,
  CreateGroceryList,
  UpdateGroceryList,
  CreateGroceryListItem,
  UpdateGroceryListItem,
  BatchCheckItems,
  SeedFromMealPlan,
  SeedFromRecipe,
} from '@varaperformance/core';

export type {
  GroceryListDetailResponse,
  GroceryListSummary,
  GroceryListItemResponse,
};

export const groceryListKeys = {
  all: ['grocery-lists'] as const,
  lists: () => [...groceryListKeys.all] as const,
  detail: (id: string) => [...groceryListKeys.all, id] as const,
};

// ==================== API FUNCTIONS ====================

const getGroceryLists = async (): Promise<
  SuccessResponse<GroceryListSummary[]>
> => {
  const response =
    await api.get<SuccessResponse<GroceryListSummary[]>>('grocery-lists');
  return response.data;
};

const getGroceryList = async (
  id: string,
): Promise<SuccessResponse<GroceryListDetailResponse>> => {
  const response = await api.get<SuccessResponse<GroceryListDetailResponse>>(
    `grocery-lists/${id}`,
  );
  return response.data;
};

const createGroceryList = async (
  data: CreateGroceryList,
): Promise<SuccessResponse<GroceryListDetailResponse>> => {
  const response = await api.post<SuccessResponse<GroceryListDetailResponse>>(
    'grocery-lists',
    data,
  );
  return response.data;
};

const updateGroceryList = async (
  id: string,
  data: UpdateGroceryList,
): Promise<SuccessResponse<GroceryListDetailResponse>> => {
  const response = await api.put<SuccessResponse<GroceryListDetailResponse>>(
    `grocery-lists/${id}`,
    data,
  );
  return response.data;
};

const deleteGroceryList = async (
  id: string,
): Promise<SuccessResponse<{ message: string }>> => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `grocery-lists/${id}`,
  );
  return response.data;
};

const addGroceryItem = async (
  listId: string,
  data: CreateGroceryListItem,
): Promise<SuccessResponse<GroceryListItemResponse>> => {
  const response = await api.post<SuccessResponse<GroceryListItemResponse>>(
    `grocery-lists/${listId}/items`,
    data,
  );
  return response.data;
};

const updateGroceryItem = async (
  listId: string,
  itemId: string,
  data: UpdateGroceryListItem,
): Promise<SuccessResponse<GroceryListItemResponse>> => {
  const response = await api.put<SuccessResponse<GroceryListItemResponse>>(
    `grocery-lists/${listId}/items/${itemId}`,
    data,
  );
  return response.data;
};

const removeGroceryItem = async (
  listId: string,
  itemId: string,
): Promise<SuccessResponse<{ message: string }>> => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `grocery-lists/${listId}/items/${itemId}`,
  );
  return response.data;
};

const batchCheckItems = async (
  listId: string,
  data: BatchCheckItems,
): Promise<SuccessResponse<{ updated: number }>> => {
  const response = await api.post<SuccessResponse<{ updated: number }>>(
    `grocery-lists/${listId}/batch-check`,
    data,
  );
  return response.data;
};

const seedFromMealPlan = async (
  data: SeedFromMealPlan,
): Promise<SuccessResponse<GroceryListDetailResponse>> => {
  const response = await api.post<SuccessResponse<GroceryListDetailResponse>>(
    'grocery-lists/seed-from-plan',
    data,
  );
  return response.data;
};

const seedFromRecipe = async (
  data: SeedFromRecipe,
): Promise<SuccessResponse<GroceryListDetailResponse>> => {
  const response = await api.post<SuccessResponse<GroceryListDetailResponse>>(
    'grocery-lists/seed-from-recipe',
    data,
  );
  return response.data;
};

// ==================== QUERY HOOKS ====================

export function useGroceryLists(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: groceryListKeys.lists(),
    queryFn: getGroceryLists,
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useGroceryList(id: string, enabled = true) {
  return useQuery({
    queryKey: groceryListKeys.detail(id),
    queryFn: () => getGroceryList(id),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

// ==================== MUTATION HOOKS ====================

export function useCreateGroceryList(options?: {
  onSuccess?: (data: SuccessResponse<GroceryListDetailResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroceryList,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUpdateGroceryList(options?: {
  onSuccess?: (data: SuccessResponse<GroceryListDetailResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGroceryList }) =>
      updateGroceryList(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDeleteGroceryList(options?: {
  onSuccess?: (data: SuccessResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroceryList,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useAddGroceryItem(options?: {
  onSuccess?: (data: SuccessResponse<GroceryListItemResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      data,
    }: {
      listId: string;
      data: CreateGroceryListItem;
    }) => addGroceryItem(listId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUpdateGroceryItem(options?: {
  onSuccess?: (data: SuccessResponse<GroceryListItemResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      itemId,
      data,
    }: {
      listId: string;
      itemId: string;
      data: UpdateGroceryListItem;
    }) => updateGroceryItem(listId, itemId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useRemoveGroceryItem(options?: {
  onSuccess?: (data: SuccessResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      removeGroceryItem(listId, itemId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useBatchCheckItems(options?: {
  onSuccess?: (data: SuccessResponse<{ updated: number }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: BatchCheckItems }) =>
      batchCheckItems(listId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useSeedFromMealPlan(options?: {
  onSuccess?: (data: SuccessResponse<GroceryListDetailResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seedFromMealPlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useSeedFromRecipe(options?: {
  onSuccess?: (data: SuccessResponse<GroceryListDetailResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seedFromRecipe,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: groceryListKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

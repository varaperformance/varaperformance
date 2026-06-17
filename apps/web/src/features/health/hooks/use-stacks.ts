import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  StackResponse,
  StackListItem,
  StackItemResponse,
  StackTip,
  DailyLogResponse,
  CreateStack,
  UpdateStack,
  AddStackItem,
  UpdateStackItem,
  BatchUpdateItems,
  TimeSlot,
} from '@varaperformance/core';

// Re-export types
export type {
  StackResponse,
  StackListItem,
  StackItemResponse,
  StackTip,
  DailyLogResponse,
  TimeSlot,
};

export const stackKeys = {
  all: ['stacks'] as const,
  lists: () => [...stackKeys.all] as const,
  active: () => [...stackKeys.all, 'active'] as const,
  detail: (id: string) => [...stackKeys.all, id] as const,
  logs: () => ['stack-logs'] as const,
  logsForDate: (stackId: string, date: string) =>
    [...stackKeys.logs(), stackId, date] as const,
};

// ========== API Functions ==========

const getStacks = async () => {
  const response = await api.get<SuccessResponse<StackListItem[]>>('stacks');
  return response.data;
};

const getActiveStack = async () => {
  const response =
    await api.get<SuccessResponse<StackResponse | null>>('stacks/active');
  return response.data;
};

const getStack = async (id: string) => {
  const response = await api.get<SuccessResponse<StackResponse>>(
    `stacks/${id}`,
  );
  return response.data;
};

const createStack = async (data: CreateStack) => {
  const response = await api.post<SuccessResponse<StackResponse>>(
    'stacks',
    data,
  );
  return response.data;
};

const updateStack = async ({ id, data }: { id: string; data: UpdateStack }) => {
  const response = await api.patch<SuccessResponse<StackResponse>>(
    `stacks/${id}`,
    data,
  );
  return response.data;
};

const deleteStack = async (id: string) => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `stacks/${id}`,
  );
  return response.data;
};

const activateStack = async (id: string) => {
  const response = await api.post<SuccessResponse<StackResponse>>(
    `stacks/${id}/activate`,
  );
  return response.data;
};

// Stack Items
const addStackItem = async ({
  stackId,
  data,
}: {
  stackId: string;
  data: AddStackItem;
}) => {
  const response = await api.post<SuccessResponse<StackItemResponse>>(
    `stacks/${stackId}/items`,
    data,
  );
  return response.data;
};

const updateStackItem = async ({
  stackId,
  itemId,
  data,
}: {
  stackId: string;
  itemId: string;
  data: UpdateStackItem;
}) => {
  const response = await api.patch<SuccessResponse<StackItemResponse>>(
    `stacks/${stackId}/items/${itemId}`,
    data,
  );
  return response.data;
};

const deleteStackItem = async ({
  stackId,
  itemId,
}: {
  stackId: string;
  itemId: string;
}) => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `stacks/${stackId}/items/${itemId}`,
  );
  return response.data;
};

const batchUpdateItems = async ({
  stackId,
  data,
}: {
  stackId: string;
  data: BatchUpdateItems;
}) => {
  const response = await api.put<SuccessResponse<StackResponse>>(
    `stacks/${stackId}/items/batch`,
    data,
  );
  return response.data;
};

// Logging
const logIntake = async ({
  stackId,
  itemId,
  date,
  taken,
}: {
  stackId: string;
  itemId: string;
  date: string;
  taken: boolean;
}) => {
  const response = await api.post<
    SuccessResponse<{ itemId: string; date: string; taken: boolean }>
  >(`stacks/${stackId}/items/${itemId}/log`, { date, taken });
  return response.data;
};

const getLogsForDate = async ({
  stackId,
  date,
}: {
  stackId: string;
  date: string;
}) => {
  const response = await api.get<SuccessResponse<DailyLogResponse>>(
    `stacks/${stackId}/logs?date=${date}`,
  );
  return response.data;
};

const resetLogsForDate = async ({
  stackId,
  date,
}: {
  stackId: string;
  date: string;
}) => {
  const response = await api.delete<SuccessResponse<{ reset: true }>>(
    `stacks/${stackId}/logs?date=${date}`,
  );
  return response.data;
};

const invalidateStackQueries = (queryClient: QueryClient, stackId?: string) => {
  queryClient.invalidateQueries({ queryKey: stackKeys.lists(), exact: true });
  queryClient.invalidateQueries({
    queryKey: stackKeys.active(),
    exact: true,
  });

  if (stackId) {
    queryClient.invalidateQueries({
      queryKey: stackKeys.detail(stackId),
      exact: true,
    });
  }
};

// ========== Hooks ==========

/**
 * Fetch all stacks for the user
 */
export function useStacks() {
  return useQuery({
    queryKey: stackKeys.lists(),
    queryFn: getStacks,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the active stack with all items
 */
export function useActiveStack(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: stackKeys.active(),
    queryFn: getActiveStack,
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch a specific stack by ID
 */
export function useStack(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: stackKeys.detail(id),
    queryFn: () => getStack(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new stack
 */
export function useCreateStack(options?: {
  onSuccess?: (data: SuccessResponse<StackResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStack,
    onSuccess: (data) => {
      invalidateStackQueries(queryClient, data.data.id);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update a stack
 */
export function useUpdateStack(options?: {
  onSuccess?: (data: SuccessResponse<StackResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStack,
    onSuccess: (data, variables) => {
      invalidateStackQueries(queryClient, variables.id);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a stack
 */
export function useDeleteStack(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStack,
    onSuccess: (_, id) => {
      invalidateStackQueries(queryClient, id);
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Activate a stack (deactivates all others)
 */
export function useActivateStack(options?: {
  onSuccess?: (data: SuccessResponse<StackResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateStack,
    onSuccess: (data, id) => {
      invalidateStackQueries(queryClient, id);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Add an item to a stack
 */
export function useAddStackItem(options?: {
  onSuccess?: (data: SuccessResponse<StackItemResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addStackItem,
    onSuccess: (data, variables) => {
      invalidateStackQueries(queryClient, variables.stackId);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update an item in a stack
 */
export function useUpdateStackItem(options?: {
  onSuccess?: (data: SuccessResponse<StackItemResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStackItem,
    onSuccess: (data, variables) => {
      invalidateStackQueries(queryClient, variables.stackId);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete an item from a stack
 */
export function useDeleteStackItem(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStackItem,
    onSuccess: (_, variables) => {
      invalidateStackQueries(queryClient, variables.stackId);
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Batch update items (for scheduling)
 */
export function useBatchUpdateItems(options?: {
  onSuccess?: (data: SuccessResponse<StackResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchUpdateItems,
    onSuccess: (data, variables) => {
      invalidateStackQueries(queryClient, variables.stackId);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Log supplement intake
 */
export function useLogIntake(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logIntake,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stackKeys.logs() });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Get logs for a specific date
 */
export function useStackLogs(
  stackId: string,
  date: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: stackKeys.logsForDate(stackId, date),
    queryFn: () => getLogsForDate({ stackId, date }),
    enabled: (options?.enabled ?? true) && !!stackId && !!date,
    staleTime: 30 * 1000, // 30 seconds - logs change frequently
  });
}

/**
 * Reset logs for a specific date
 */
export function useResetLogs(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetLogsForDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stackKeys.logs() });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

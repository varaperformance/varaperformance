import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  NoteResponse,
  NotesListData,
  CreateNote,
  UpdateNote,
} from '@varaperformance/core';

// Re-export types for convenience
export type { NoteResponse, NotesListData };

export const noteKeys = {
  all: ['notes'] as const,
  list: (page: number, limit: number) =>
    [...noteKeys.all, page, limit] as const,
  detail: (id: string) => ['note', id] as const,
};

// API functions
const getNotes = async (page = 1, limit = 20) => {
  const response = await api.get<SuccessResponse<NotesListData>>(
    `notes?page=${page}&limit=${limit}`,
  );
  return response.data;
};

const getNote = async (id: string) => {
  const response = await api.get<SuccessResponse<NoteResponse>>(`notes/${id}`);
  return response.data;
};

const createNote = async (data: CreateNote) => {
  const response = await api.post<SuccessResponse<NoteResponse>>('notes', data);
  return response.data;
};

const updateNote = async ({ id, data }: { id: string; data: UpdateNote }) => {
  const response = await api.patch<SuccessResponse<NoteResponse>>(
    `notes/${id}`,
    data,
  );
  return response.data;
};

const deleteNote = async (id: string) => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    `notes/${id}`,
  );
  return response.data;
};

/**
 * Fetch paginated notes
 */
export function useNotes(page = 1, limit = 20) {
  return useQuery({
    queryKey: noteKeys.list(page, limit),
    queryFn: () => getNotes(page, limit),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single note by ID
 */
export function useNote(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => getNote(id),
    enabled: options?.enabled ?? !!id,
  });
}

/**
 * Create a new note
 */
export function useCreateNote(options?: {
  onSuccess?: (data: SuccessResponse<NoteResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update an existing note
 */
export function useUpdateNote(options?: {
  onSuccess?: (data: SuccessResponse<NoteResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNote,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
      if (data.data?.id) {
        queryClient.invalidateQueries({
          queryKey: noteKeys.detail(data.data.id),
        });
      }
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a note
 */
export function useDeleteNote(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

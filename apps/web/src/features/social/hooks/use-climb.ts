import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ClimbCategory, SuccessResponse } from '@varaperformance/core';

export interface ClimbEntriesQuery {
  category?: ClimbCategory;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface CreateClimbEntry {
  category?: ClimbCategory;
  imageUrl: string;
  note?: string;
  capturedDate?: string;
}

export interface ClimbEntry {
  id: string;
  category: ClimbCategory;
  imageUrl: string;
  note: string | null;
  capturedAt: string;
  capturedDate: string;
  createdAt: string;
  updatedAt: string;
}

interface ClimbEntriesResponse {
  items: ClimbEntry[];
  limit: number;
  timezone: string;
  todayDate: string;
}

export const climbKeys = {
  all: ['climb'] as const,
  entries: (params?: ClimbEntriesQuery) =>
    ['climb', 'entries', params] as const,
};

export function useClimbEntries(params?: ClimbEntriesQuery) {
  return useQuery({
    queryKey: climbKeys.entries(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
      if (params?.toDate) searchParams.set('toDate', params.toDate);
      if (params?.limit) searchParams.set('limit', String(params.limit));

      const query = searchParams.toString();
      const response = await api.get<SuccessResponse<ClimbEntriesResponse>>(
        query ? `/climb/entries?${query}` : '/climb/entries',
      );
      return response.data;
    },
  });
}

export function useUploadClimbPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<SuccessResponse<{ url: string }>>(
        '/climb/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return response.data;
    },
  });
}

export function useSaveClimbEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateClimbEntry) => {
      const response = await api.post<SuccessResponse<ClimbEntry>>(
        '/climb/entries',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: climbKeys.all });
    },
  });
}

export function useDeleteClimbEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
        `/climb/entries/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: climbKeys.all });
    },
  });
}

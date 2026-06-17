import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SuccessResponse, PaginatedResponse } from '@varaperformance/core';

// ==================== Types ====================

export interface ReleaseNote {
  id: string;
  version: string;
  title: string | null;
  type: 'MAJOR' | 'MINOR' | 'PATCH';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  highlights: string[];
  features: string[];
  improvements: string[];
  fixes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicReleaseNote {
  id: string;
  version: string;
  title: string | null;
  type: 'MAJOR' | 'MINOR' | 'PATCH';
  publishedAt: string | null;
  highlights: string[];
  features: string[];
  improvements: string[];
  fixes: string[];
}

// ==================== Query Keys ====================

export const releaseNoteKeys = {
  all: ['release-notes'] as const,
  public: () => [...releaseNoteKeys.all, 'public'] as const,
  latest: () => [...releaseNoteKeys.all, 'latest'] as const,
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
  }) => [...releaseNoteKeys.all, 'list', params] as const,
  detail: (id: string) => [...releaseNoteKeys.all, 'detail', id] as const,
};

// ==================== Public Hooks ====================

export function usePublicReleaseNotes() {
  return useQuery({
    queryKey: releaseNoteKeys.public(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<PublicReleaseNote[]>>(
        '/release-notes/public',
      );
      return response.data;
    },
  });
}

export function useLatestRelease() {
  return useQuery({
    queryKey: releaseNoteKeys.latest(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<PublicReleaseNote>>(
        '/release-notes/latest',
      );
      return response.data;
    },
  });
}

// ==================== Admin Hooks ====================

export function useReleaseNotes(params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: releaseNoteKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);
      if (params?.type) searchParams.set('type', params.type);
      if (params?.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResponse<ReleaseNote>>(
        `/release-notes?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useReleaseNote(id: string) {
  return useQuery({
    queryKey: releaseNoteKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<ReleaseNote>>(
        `/release-notes/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateReleaseNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      version: string;
      title?: string;
      type?: 'MAJOR' | 'MINOR' | 'PATCH';
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      publishedAt?: string;
      highlights?: string[];
      features?: string[];
      improvements?: string[];
      fixes?: string[];
    }) => {
      const response = await api.post<SuccessResponse<ReleaseNote>>(
        '/release-notes',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseNoteKeys.all });
    },
  });
}

export function useUpdateReleaseNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        version?: string;
        title?: string;
        type?: 'MAJOR' | 'MINOR' | 'PATCH';
        status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
        publishedAt?: string;
        highlights?: string[];
        features?: string[];
        improvements?: string[];
        fixes?: string[];
      };
    }) => {
      const response = await api.patch<SuccessResponse<ReleaseNote>>(
        `/release-notes/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseNoteKeys.all });
    },
  });
}

export function useDeleteReleaseNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
        `/release-notes/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: releaseNoteKeys.all });
    },
  });
}

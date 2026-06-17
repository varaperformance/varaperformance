import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  CreateSpotlight,
  PaginatedResponse,
  PublicSpotlightStory,
  SubmitSpotlight,
  SpotlightStory,
  SuccessResponse,
  UpdateSpotlight,
} from '@varaperformance/core';

export const spotlightKeys = {
  all: ['spotlight'] as const,
  public: (limit = 12) => [...spotlightKeys.all, 'public', limit] as const,
  publicBySlug: (slug: string) =>
    [...spotlightKeys.all, 'public', 'slug', slug] as const,
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    isActive?: boolean;
    featured?: boolean;
    submitterEmail?: string;
  }) => [...spotlightKeys.all, 'list', params] as const,
  detail: (id: string) => [...spotlightKeys.all, 'detail', id] as const,
};

export function spotlightSelectors(stories: PublicSpotlightStory[]) {
  const featured = stories.find((story) => story.featured) ?? null;
  const previous = stories.filter((story) => story.id !== featured?.id);
  return { featured, previous };
}

export function usePublicSpotlight(limit = 12) {
  return useQuery({
    queryKey: spotlightKeys.public(limit),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<PublicSpotlightStory[]>>(
        `/spotlight/public?limit=${limit}`,
      );
      return response.data;
    },
  });
}

export function usePublicSpotlightBySlug(slug?: string) {
  return useQuery({
    queryKey: spotlightKeys.publicBySlug(slug ?? ''),
    queryFn: async () => {
      if (!slug) {
        throw new Error('Spotlight slug is required');
      }
      const response = await api.get<SuccessResponse<PublicSpotlightStory>>(
        `/spotlight/public/${slug}`,
      );
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useSpotlights(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  isActive?: boolean;
  featured?: boolean;
  submitterEmail?: string;
}) {
  return useQuery({
    queryKey: spotlightKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.search) searchParams.set('search', params.search);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.isActive !== undefined) {
        searchParams.set('isActive', String(params.isActive));
      }
      if (params?.featured !== undefined) {
        searchParams.set('featured', String(params.featured));
      }
      if (params?.submitterEmail) {
        searchParams.set('submitterEmail', params.submitterEmail);
      }

      const response = await api.get<PaginatedResponse<SpotlightStory>>(
        `/spotlight?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useSubmitSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitSpotlight) => {
      const response = await api.post<SuccessResponse<SpotlightStory>>(
        '/spotlight/submit',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spotlightKeys.all });
    },
  });
}

export function useSpotlight(id?: string) {
  return useQuery({
    queryKey: spotlightKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Spotlight id is required');
      }
      const response = await api.get<SuccessResponse<SpotlightStory>>(
        `/spotlight/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSpotlight) => {
      const response = await api.post<SuccessResponse<SpotlightStory>>(
        '/spotlight',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spotlightKeys.all });
    },
  });
}

export function useUpdateSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSpotlight }) => {
      const response = await api.patch<SuccessResponse<SpotlightStory>>(
        `/spotlight/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: spotlightKeys.all });
      queryClient.invalidateQueries({ queryKey: spotlightKeys.detail(id) });
    },
  });
}

export function useDeleteSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
        `/spotlight/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spotlightKeys.all });
    },
  });
}

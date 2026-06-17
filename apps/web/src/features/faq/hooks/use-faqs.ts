import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SuccessResponse, PaginatedResponse } from '@varaperformance/core';

// ==================== Types ====================

export interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    faqs: number;
  };
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  isFeatured: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
  isFeatured: boolean;
}

export interface PublicFaqCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  faqs: PublicFaq[];
}

// ==================== Query Keys ====================

export const faqKeys = {
  all: ['faqs'] as const,
  public: () => [...faqKeys.all, 'public'] as const,
  featured: () => [...faqKeys.all, 'featured'] as const,
  categories: (params?: { page?: number; limit?: number; search?: string }) =>
    [...faqKeys.all, 'categories', params] as const,
  category: (id: string) => [...faqKeys.all, 'category', id] as const,
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
  }) => [...faqKeys.all, 'list', params] as const,
  detail: (id: string) => [...faqKeys.all, 'detail', id] as const,
};

// ==================== Public Hooks ====================

/**
 * Get public FAQs grouped by category
 */
export function usePublicFaqs() {
  return useQuery({
    queryKey: faqKeys.public(),
    queryFn: async () => {
      const response =
        await api.get<SuccessResponse<PublicFaqCategory[]>>('/faqs/public');
      return response.data;
    },
  });
}

/**
 * Get featured FAQs
 */
export function useFeaturedFaqs() {
  return useQuery({
    queryKey: faqKeys.featured(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<
          (PublicFaq & {
            category: { id: string; name: string; slug: string };
          })[]
        >
      >('/faqs/featured');
      return response.data;
    },
  });
}

/**
 * Increment FAQ view count
 */
export function useIncrementFaqView() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<
        SuccessResponse<{ id: string; views: number }>
      >(`/faqs/${id}/view`);
      return response.data;
    },
  });
}

// ==================== Admin Category Hooks ====================

/**
 * Get FAQ categories (admin)
 */
export function useFaqCategories(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: faqKeys.categories(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResponse<FaqCategory>>(
        `/faqs/categories?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get a single FAQ category
 */
export function useFaqCategory(id: string) {
  return useQuery({
    queryKey: faqKeys.category(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<FaqCategory>>(
        `/faqs/categories/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Create FAQ category
 */
export function useCreateFaqCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      slug: string;
      description?: string;
      order?: number;
      isActive?: boolean;
    }) => {
      const response = await api.post<SuccessResponse<FaqCategory>>(
        '/faqs/categories',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faqKeys.categories() });
    },
  });
}

/**
 * Update FAQ category
 */
export function useUpdateFaqCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        slug?: string;
        description?: string;
        order?: number;
        isActive?: boolean;
      };
    }) => {
      const response = await api.patch<SuccessResponse<FaqCategory>>(
        `/faqs/categories/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: faqKeys.categories() });
      queryClient.invalidateQueries({ queryKey: faqKeys.category(id) });
    },
  });
}

/**
 * Delete FAQ category
 */
export function useDeleteFaqCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
        `/faqs/categories/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faqKeys.categories() });
    },
  });
}

// ==================== Admin FAQ Hooks ====================

/**
 * Get FAQs (admin)
 */
export function useFaqs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}) {
  return useQuery({
    queryKey: faqKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);
      if (params?.categoryId) searchParams.set('categoryId', params.categoryId);

      const response = await api.get<PaginatedResponse<Faq>>(
        `/faqs?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get a single FAQ
 */
export function useFaq(id: string) {
  return useQuery({
    queryKey: faqKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<Faq>>(`/faqs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Create FAQ
 */
export function useCreateFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      question: string;
      answer: string;
      categoryId: string;
      order?: number;
      isActive?: boolean;
      isFeatured?: boolean;
    }) => {
      const response = await api.post<SuccessResponse<Faq>>('/faqs', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faqKeys.list() });
      queryClient.invalidateQueries({ queryKey: faqKeys.public() });
    },
  });
}

/**
 * Update FAQ
 */
export function useUpdateFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        question?: string;
        answer?: string;
        categoryId?: string;
        order?: number;
        isActive?: boolean;
        isFeatured?: boolean;
      };
    }) => {
      const response = await api.patch<SuccessResponse<Faq>>(
        `/faqs/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: faqKeys.list() });
      queryClient.invalidateQueries({ queryKey: faqKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: faqKeys.public() });
    },
  });
}

/**
 * Delete FAQ
 */
export function useDeleteFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
        `/faqs/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faqKeys.list() });
      queryClient.invalidateQueries({ queryKey: faqKeys.public() });
    },
  });
}

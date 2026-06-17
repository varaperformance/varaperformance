import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  SocialsResponse,
  CreateSocials,
} from '@varaperformance/core';

// Re-export types for convenience
export type { SocialsResponse };

export const socialKeys = {
  all: ['socials'] as const,
};

// API functions
const getSocials = async () => {
  const response =
    await api.get<SuccessResponse<SocialsResponse | null>>('socials');
  return response.data;
};

const saveSocials = async (data: CreateSocials) => {
  const response = await api.put<SuccessResponse<SocialsResponse>>(
    'socials',
    data,
  );
  return response.data;
};

const deleteSocials = async () => {
  const response =
    await api.delete<SuccessResponse<{ message: string }>>('socials');
  return response.data;
};

/**
 * Fetch current user's socials
 */
export function useSocials(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: socialKeys.all,
    queryFn: getSocials,
    enabled: options?.enabled ?? true,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Save socials (upsert)
 */
export function useSaveSocials(options?: {
  onSuccess?: (data: SuccessResponse<SocialsResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveSocials,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete socials
 */
export function useDeleteSocials(options?: {
  onSuccess?: (data: SuccessResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSocials,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

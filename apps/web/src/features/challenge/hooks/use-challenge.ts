import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  ChallengeResponse,
  ChallengeParticipantResponse,
  ChallengeLeaderboardEntry,
  CreateChallenge,
  UpdateChallenge,
  ChallengeQuery,
} from '@varaperformance/core';

export const challengeKeys = {
  all: ['challenges'] as const,
  list: (params?: Partial<ChallengeQuery>) =>
    ['challenges', 'list', params] as const,
  mine: () => ['challenges', 'mine'] as const,
  detail: (id: string) => ['challenges', id] as const,
  leaderboard: (id: string) => ['challenges', id, 'leaderboard'] as const,
  participants: (id: string) => ['challenges', id, 'participants'] as const,
};

// ==================== Queries ====================

export function useChallenges(params?: Partial<ChallengeQuery>) {
  return useQuery({
    queryKey: challengeKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      if (params?.type) searchParams.set('type', params.type);
      if (params?.isOfficial !== undefined)
        searchParams.set('isOfficial', String(params.isOfficial));

      const query = searchParams.toString();
      const response = await api.get<
        SuccessResponse<{
          items: ChallengeResponse[];
          total: number;
          page: number;
        }>
      >(query ? `/challenges?${query}` : '/challenges');
      return response.data;
    },
  });
}

export function useMyChallenges(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: challengeKeys.mine(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{
          created: ChallengeResponse[];
          joined: ChallengeResponse[];
        }>
      >('/challenges/me');
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useChallenge(id: string) {
  return useQuery({
    queryKey: challengeKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<ChallengeResponse>>(
        `/challenges/${id}`,
      );
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useChallengeLeaderboard(id: string) {
  return useQuery({
    queryKey: challengeKeys.leaderboard(id),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: ChallengeLeaderboardEntry[] }>
      >(`/challenges/${id}/leaderboard`);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useChallengeParticipants(id: string) {
  return useQuery({
    queryKey: challengeKeys.participants(id),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: ChallengeParticipantResponse[] }>
      >(`/challenges/${id}/participants`);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

// ==================== Mutations ====================

export function useCreateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChallenge) => {
      const response = await api.post<SuccessResponse<ChallengeResponse>>(
        '/challenges',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateChallenge }) => {
      const response = await api.put<SuccessResponse<ChallengeResponse>>(
        `/challenges/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
        `/challenges/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<SuccessResponse<{ joined: boolean }>>(
        `/challenges/${id}/join`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

export function useWithdrawChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<SuccessResponse<{ withdrawn: boolean }>>(
        `/challenges/${id}/withdraw`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

export function useUpdateChallengeProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      const response = await api.patch<
        SuccessResponse<{ progress: number; completed: boolean }>
      >(`/challenges/${id}/progress`, { progress });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: challengeKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: challengeKeys.leaderboard(variables.id),
      });
    },
  });
}

export function useShareChallengeToElevate() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<SuccessResponse<{ postId: string }>>(
        `/challenges/${id}/share`,
      );
      return response.data;
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  AchievementResponse,
  UserAchievementResponse,
} from '@varaperformance/core';

export const achievementKeys = {
  all: ['achievements'] as const,
  lists: () => [...achievementKeys.all] as const,
  me: () => [...achievementKeys.all, 'me'] as const,
  user: (userId: string | undefined) =>
    [...achievementKeys.all, 'user', userId] as const,
};

const getAchievements = async () => {
  const response =
    await api.get<SuccessResponse<{ items: AchievementResponse[] }>>(
      'achievements',
    );
  return response.data;
};

const getMyAchievements = async () => {
  const response =
    await api.get<SuccessResponse<{ items: UserAchievementResponse[] }>>(
      'achievements/me',
    );
  return response.data;
};

export function useAchievements() {
  return useQuery({
    queryKey: achievementKeys.lists(),
    queryFn: getAchievements,
    staleTime: 30 * 60 * 1000, // 30 minutes — rarely changes
  });
}

export function useMyAchievements(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: achievementKeys.me(),
    queryFn: getMyAchievements,
    enabled: options?.enabled ?? true,
  });
}

export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: achievementKeys.user(userId),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: UserAchievementResponse[] }>
      >(`achievements/user/${userId}`);
      return response.data;
    },
    enabled: Boolean(userId),
  });
}

export function useShareAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achievementId: string) => {
      const response = await api.post<SuccessResponse<{ postId: string }>>(
        `achievements/${achievementId}/share`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevate'] });
    },
  });
}

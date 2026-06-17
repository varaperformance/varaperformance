import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  NotificationPreferences,
  UpdateNotificationPreferences,
  SuccessResponse,
} from '@varaperformance/core';

export const notificationPreferencesKeys = {
  all: ['notification-preferences'] as const,
};

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationPreferencesKeys.all,
    queryFn: async () => {
      const { data } = await api.get<SuccessResponse<NotificationPreferences>>(
        'notifications/preferences',
      );
      return data.data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: UpdateNotificationPreferences) => {
      const { data } = await api.put<SuccessResponse<NotificationPreferences>>(
        'notifications/preferences',
        update,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationPreferencesKeys.all,
      });
    },
  });
}

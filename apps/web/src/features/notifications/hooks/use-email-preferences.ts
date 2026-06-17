import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SuccessResponse } from '@varaperformance/core';

export const emailPreferencesKeys = {
  all: ['consent', 'email-preferences'] as const,
};

interface EmailPreferencesData {
  marketingOptIn: boolean;
}

export function useEmailPreferences() {
  return useQuery({
    queryKey: emailPreferencesKeys.all,
    queryFn: async () => {
      const { data } = await api.get<SuccessResponse<EmailPreferencesData>>(
        'consent/email-preferences',
      );
      return data.data;
    },
  });
}

export function useUpdateEmailPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (marketingOptIn: boolean) => {
      const { data } = await api.put<SuccessResponse<EmailPreferencesData>>(
        'consent/email-preferences',
        { marketingOptIn },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailPreferencesKeys.all,
      });
    },
  });
}

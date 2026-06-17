import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  UpdateDashboardPreference,
  DashboardCardId,
  CardSize,
} from '@varaperformance/core';

interface DashboardPreferenceData {
  visibleCards: DashboardCardId[];
  cardOrder: DashboardCardId[];
  cardSizes: Record<string, CardSize> | null;
}

export const dashboardPreferencesQueryKey = ['dashboard-preferences'] as const;

async function fetchDashboardPreferences(): Promise<DashboardPreferenceData> {
  const response = await api.get<SuccessResponse<DashboardPreferenceData>>(
    'dashboard/preferences',
  );
  return response.data.data;
}

export function useDashboardPreferences() {
  return useQuery({
    queryKey: dashboardPreferencesQueryKey,
    queryFn: fetchDashboardPreferences,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Warms dashboard layout prefs after login (same cache as the dashboard page).
 */
export function prefetchDashboardPreferences(
  queryClient: import('@tanstack/react-query').QueryClient,
) {
  return queryClient.prefetchQuery({
    queryKey: dashboardPreferencesQueryKey,
    queryFn: fetchDashboardPreferences,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateDashboardPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateDashboardPreference) => {
      const response = await api.put<SuccessResponse<DashboardPreferenceData>>(
        'dashboard/preferences',
        dto,
      );
      return response.data.data;
    },
    onMutate: async (dto) => {
      await queryClient.cancelQueries({
        queryKey: dashboardPreferencesQueryKey,
      });
      const previous = queryClient.getQueryData<DashboardPreferenceData>(
        dashboardPreferencesQueryKey,
      );
      queryClient.setQueryData<DashboardPreferenceData>(
        dashboardPreferencesQueryKey,
        (old) => ({
          visibleCards: dto.visibleCards as DashboardCardId[],
          cardOrder: dto.cardOrder as DashboardCardId[],
          cardSizes: dto.cardSizes ?? old?.cardSizes ?? null,
        }),
      );
      return { previous };
    },
    onError: (err, _dto, context) => {
      console.error('[dashboard] preference update failed', err);
      if (context?.previous) {
        queryClient.setQueryData(
          dashboardPreferencesQueryKey,
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardPreferencesQueryKey });
    },
  });
}

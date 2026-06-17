import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SiteStatResponse } from '@varaperformance/core';

interface StatsApiResponse {
  success: boolean;
  data: SiteStatResponse[];
}

export const siteStatsKeys = {
  all: ['site-stats'] as const,
};

const formatStatValue = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const fetchSiteStats = async (): Promise<Record<string, string>> => {
  const response = await api.get<StatsApiResponse>('/status/stats');
  const map: Record<string, string> = {};
  for (const s of response.data.data) {
    map[s.key] = s.value;
  }
  return map;
};

export function useSiteStats() {
  const { data: stats, ...query } = useQuery({
    queryKey: siteStatsKeys.all,
    queryFn: fetchSiteStats,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const workoutsLogged = stats?.workouts_logged
    ? formatStatValue(Number(stats.workouts_logged))
    : '--';
  const activeUsers = stats?.active_users
    ? formatStatValue(Number(stats.active_users))
    : '--';
  const personalRecords = stats?.personal_records
    ? formatStatValue(Number(stats.personal_records))
    : '--';
  const exercisesAvailable = stats?.exercises_available
    ? formatStatValue(Number(stats.exercises_available))
    : '--';

  return {
    stats,
    workoutsLogged,
    activeUsers,
    personalRecords,
    exercisesAvailable,
    ...query,
  };
}

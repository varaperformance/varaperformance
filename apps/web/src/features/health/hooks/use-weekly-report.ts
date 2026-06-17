import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface WeeklyReportData {
  workoutsLogged: number;
  personalRecords: number;
  waterGoalDaysHit: number;
  habitsCompleted: number;
  currentHabitStreak: number;
  caloriesAvg: number | null;
  proteinAvg: number | null;
  carbsAvg: number | null;
  fatsAvg: number | null;
  nutritionLoggedDays: number;
  workoutDurationMinutes: number;
  totalVolume: number;
  muscleGroupsTrained: number;
  habitCompletionPercent: number | null;
  measurementDeltas: {
    waist: number | null;
    chest: number | null;
    hips: number | null;
  } | null;
  achievementsEarned: number;
  activeChallenges: number;
  lifestyleAdherenceScore: number | null;
  lifestyleAdherencePrevious: number | null;
  stackCompliancePercent: number | null;
  injectionCompliancePercent: number | null;
  avgDailySteps: number | null;
  stepGoalDaysHit: number;
}

export const weeklyReportKeys = {
  all: ['weekly-report'] as const,
  report: (days: number) => [...weeklyReportKeys.all, days] as const,
  client: (bookingId: string, days: number) =>
    [...weeklyReportKeys.all, 'client', bookingId, days] as const,
};

const getWeeklyReport = async (days: number) => {
  const response = await api.get<{ data: WeeklyReportData }>(
    `weekly-report?days=${days}`,
  );
  return response.data;
};

export function useWeeklyReport(days = 7) {
  return useQuery({
    queryKey: weeklyReportKeys.report(days),
    queryFn: () => getWeeklyReport(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

const getClientWeeklyReport = async (bookingId: string, days: number) => {
  const response = await api.get<{ data: WeeklyReportData }>(
    `weekly-report/client/${bookingId}?days=${days}`,
  );
  return response.data;
};

export function useClientWeeklyReport(bookingId: string, days = 7) {
  return useQuery({
    queryKey: weeklyReportKeys.client(bookingId, days),
    queryFn: () => getClientWeeklyReport(bookingId, days),
    enabled: !!bookingId,
    staleTime: 5 * 60 * 1000,
  });
}

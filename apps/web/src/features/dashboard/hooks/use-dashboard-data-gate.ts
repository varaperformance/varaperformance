import { useCallback, useMemo } from 'react';
import type { DashboardCardId } from '@varaperformance/core';

/** Which dashboard cards need each query bundle (coarse, safe overlaps). */
export const dashboardQueryCards = {
  dailyNutrition: [
    'goal-calories',
    'goal-protein',
    'goal-carbs',
    'goal-fats',
    'stat-calories',
    'todays-macros',
  ],
  water: ['goal-water', 'hydration-trend'],
  weight: ['body-composition', 'weight-progress', 'stat-yearly'],
  workoutSessions: [
    'training-overview',
    'strength-progress',
    'weekly-duration',
    'weekly-volume',
    'goal-workouts',
    'stat-streak',
    'stat-yearly',
    'recent-workouts',
    'motivation-quote',
    'pr-timeline',
  ],
  workoutActivity: [
    'training-overview',
    'stat-yearly',
    'weekly-duration',
    'weekly-volume',
    'stat-streak',
  ],
  personalRecords: ['stat-prs', 'pr-timeline'],
  muscleBreakdown: ['training-overview', 'motivation-quote'],
  recentWorkouts: ['recent-workouts'],
  workoutGoals: [
    'goal-workouts',
    'motivation-quote',
    'stat-streak',
    'stat-yearly',
    'stat-calories',
  ],
  motivationQuote: ['motivation-quote'],
  lifestyle: [
    'sleep-recovery',
    'lifestyle-adherence',
    'heart-rate',
    'goal-sleep',
  ],
  habits: ['habits'],
  achievements: ['achievements'],
  challenges: ['challenges'],
  measurements: ['body-measurements'],
  waterHistory: ['hydration-trend'],
  nutritionHistory: ['nutrition-trend', 'todays-macros'],
  stack: ['stack-compliance'],
  meal: ['meal-plan'],
  grocery: ['meal-plan'],
  steps: ['goal-steps', 'step-trend'],
  heartRate: ['heart-rate'],
  lifestyleGoal: ['goal-sleep'],
  sleep: ['sleep-recovery', 'goal-sleep', 'lifestyle-adherence'],
} as const satisfies Record<string, readonly DashboardCardId[]>;

/**
 * When dashboard preferences are still loading and no cache exists, we fetch
 * all data. Once prefs are known, we only run queries for visible cards.
 */
export function useDashboardDataGate(
  visibleCards: readonly DashboardCardId[],
  /** True while preferences have never loaded (no cache); run all card queries. */
  bypassGate: boolean,
) {
  const visibleSet = useMemo(() => new Set(visibleCards), [visibleCards]);

  const gate = useCallback(
    (ids: readonly DashboardCardId[]) => {
      if (bypassGate) return true;
      return ids.some((id) => visibleSet.has(id));
    },
    [bypassGate, visibleSet],
  );

  return { gate, visibleSet };
}

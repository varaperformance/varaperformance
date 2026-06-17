import { z } from 'zod';

export const DASHBOARD_CARD_IDS = [
  // Row 1: Daily inspiration (8×1)
  'motivation-quote',
  // Row 2: Daily goal widgets — 8 × 1×1
  'goal-workouts',
  'goal-calories',
  'goal-protein',
  'goal-carbs',
  'goal-fats',
  'goal-water',
  'goal-steps',
  'goal-sleep',
  // Row 3: Key stat highlights — 4 × 2×1
  'stat-streak',
  'stat-yearly',
  'stat-calories',
  'stat-prs',
  // Rows 4–7: Training activity heatmap + muscle chart (8×4)
  'training-overview',
  // Rows 8–9: Recent activity + strength (4×2 + 4×2)
  'recent-workouts',
  'strength-progress',
  // Rows 10–11: Body metrics (4×2 + 4×2)
  'body-composition',
  'weight-progress',
  // Rows 12–13: Nutrition (4×2 + 4×2)
  'todays-macros',
  'nutrition-trend',
  // Rows 14–15: Health metrics — 4 × 2×2
  'heart-rate',
  'sleep-recovery',
  'weekly-volume',
  'weekly-duration',
  // Rows 16–17: Daily habits (4×2 + 4×2)
  'step-trend',
  'hydration-trend',
  // Rows 18–19: Plans + milestones (4×2 + 4×2)
  'meal-plan',
  'pr-timeline',
  // Rows 20–21: Engagement — 4 × 2×2
  'body-measurements',
  'habits',
  'achievements',
  'challenges',
  // Row 22: Compliance summary (4×1 + 4×1)
  'lifestyle-adherence',
  'stack-compliance',
] as const;

export const DashboardCardIdSchema = z.enum(DASHBOARD_CARD_IDS);

export type DashboardCardId = z.infer<typeof DashboardCardIdSchema>;

export const CardSizeSchema = z.object({
  cols: z.number().int().min(1).max(8),
  rows: z.number().int().min(1).max(4),
});

export type CardSize = z.infer<typeof CardSizeSchema>;

export const UpdateDashboardPreferenceSchema = z.object({
  visibleCards: z.array(DashboardCardIdSchema).min(1),
  cardOrder: z.array(DashboardCardIdSchema).min(1),
  cardSizes: z.record(z.string(), CardSizeSchema).optional(),
});

export type UpdateDashboardPreference = z.infer<
  typeof UpdateDashboardPreferenceSchema
>;

export const DashboardPreferenceResponseSchema = z.object({
  visibleCards: z.array(z.string()),
  cardOrder: z.array(z.string()),
  cardSizes: z.record(z.string(), CardSizeSchema).nullable().optional(),
});

export type DashboardPreferenceResponse = z.infer<
  typeof DashboardPreferenceResponseSchema
>;

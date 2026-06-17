import { z } from 'zod';

// Measurement deltas sub-schema (changes vs previous period)
export const MeasurementDeltasSchema = z.object({
  waist: z.number().nullable(),
  chest: z.number().nullable(),
  hips: z.number().nullable(),
});

// Weekly report data schema (for validation)
export const WeeklyReportDataSchema = z.object({
  // Existing metrics
  workoutsLogged: z.number().int().min(0),
  personalRecords: z.number().int().min(0),
  waterGoalDaysHit: z.number().int().min(0),
  habitsCompleted: z.number().int().min(0),
  currentHabitStreak: z.number().int().min(0),
  caloriesAvg: z.number().nullable(),
  proteinAvg: z.number().nullable(),

  // New: full macro breakdown
  carbsAvg: z.number().nullable(),
  fatsAvg: z.number().nullable(),
  nutritionLoggedDays: z.number().int().min(0),

  // New: workout summary
  workoutDurationMinutes: z.number().int().min(0),
  totalVolume: z.number().min(0),
  muscleGroupsTrained: z.number().int().min(0),

  // New: habit completion %
  habitCompletionPercent: z.number().min(0).max(100).nullable(),

  // New: body measurement deltas
  measurementDeltas: MeasurementDeltasSchema.nullable(),

  // New: achievements & challenges
  achievementsEarned: z.number().int().min(0),
  activeChallenges: z.number().int().min(0),

  // Steps
  avgDailySteps: z.number().int().min(0).nullable(),
  stepGoalDaysHit: z.number().int().min(0),

  // Lifestyle adherence
  lifestyleAdherenceScore: z.number().min(0).max(100).nullable(),
  lifestyleAdherencePrevious: z.number().min(0).max(100).nullable(),

  // Stack / injection compliance
  stackCompliancePercent: z.number().min(0).max(100).nullable(),
  injectionCompliancePercent: z.number().min(0).max(100).nullable(),
});

// Query params for configurable time range
export const WeeklyReportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

// Inferred types
export type WeeklyReportDataInput = z.infer<typeof WeeklyReportDataSchema>;
export type WeeklyReportQuery = z.infer<typeof WeeklyReportQuerySchema>;

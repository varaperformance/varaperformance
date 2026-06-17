import { z } from 'zod';

import { WorkoutSessionSourceSchema } from './workout.schema';

// ─── Health Data Type ─────────────────────────────────────────────────────────

export const HealthDataTypeSchema = z.enum([
  'steps',
  'sleep',
  'heartRate',
  'weight',
  'workouts',
]);
export type HealthDataType = z.infer<typeof HealthDataTypeSchema>;

// ─── Steps ────────────────────────────────────────────────────────────────────

export const LogStepsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0).max(200_000),
  source: WorkoutSessionSourceSchema.optional(),
});
export type LogSteps = z.infer<typeof LogStepsSchema>;

export const StepLogResponseSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  steps: z.number().int(),
  source: WorkoutSessionSourceSchema,
  createdAt: z.string(),
});
export type StepLogResponse = z.infer<typeof StepLogResponseSchema>;

export const StepTrendQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type StepTrendQuery = z.infer<typeof StepTrendQuerySchema>;

// ─── Sleep ────────────────────────────────────────────────────────────────────

export const LogSleepSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().min(0).max(24),
  source: WorkoutSessionSourceSchema.optional(),
});
export type LogSleep = z.infer<typeof LogSleepSchema>;

export const SleepLogResponseSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  duration: z.number(),
  source: WorkoutSessionSourceSchema,
  createdAt: z.string(),
});
export type SleepLogResponse = z.infer<typeof SleepLogResponseSchema>;

export const SleepTrendQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type SleepTrendQuery = z.infer<typeof SleepTrendQuerySchema>;

// ─── Heart Rate ───────────────────────────────────────────────────────────────

export const LogHeartRateSchema = z.object({
  timestamp: z.string().datetime(),
  bpm: z.number().int().min(20).max(300),
  source: WorkoutSessionSourceSchema.optional(),
});
export type LogHeartRate = z.infer<typeof LogHeartRateSchema>;

export const LogHeartRateBatchSchema = z.object({
  samples: z.array(LogHeartRateSchema).min(1).max(2000),
});
export type LogHeartRateBatch = z.infer<typeof LogHeartRateBatchSchema>;

export const HeartRateLogResponseSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  bpm: z.number().int(),
  source: WorkoutSessionSourceSchema,
  createdAt: z.string(),
});
export type HeartRateLogResponse = z.infer<typeof HeartRateLogResponseSchema>;

export const HeartRateQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type HeartRateQuery = z.infer<typeof HeartRateQuerySchema>;

export const HeartRateDailySummarySchema = z.object({
  date: z.string(),
  min: z.number().int(),
  max: z.number().int(),
  avg: z.number().int(),
  count: z.number().int(),
  source: z.string(),
});
export type HeartRateDailySummary = z.infer<typeof HeartRateDailySummarySchema>;

// ─── Health Sync ──────────────────────────────────────────────────────────────

export const HealthSyncStatusResponseSchema = z.object({
  dataType: HealthDataTypeSchema,
  source: WorkoutSessionSourceSchema,
  lastSyncedAt: z.string().nullable(),
  syncCount: z.number().int(),
});
export type HealthSyncStatusResponse = z.infer<
  typeof HealthSyncStatusResponseSchema
>;

// ─── Weight Sync ───────────────────────────────────────────────────────────────────────

export const SyncWeightEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number().positive().max(2000),
});
export type SyncWeightEntry = z.infer<typeof SyncWeightEntrySchema>;

// ─── Water Sync ────────────────────────────────────────────────────────────────────────

export const SyncWaterEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive().max(50000),
});
export type SyncWaterEntry = z.infer<typeof SyncWaterEntrySchema>;

// ─── Workout Sync ──────────────────────────────────────────────────────────────────────

export const SyncWorkoutEntrySchema = z.object({
  name: z.string().max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  calories: z.number().min(0).max(100000).optional(),
  duration: z.number().min(0).max(86400).optional(),
  healthKitId: z.string().max(255).optional(),
  activityType: z.string().max(100).optional(),
  distanceMeters: z.number().min(0).optional(),
  averageHeartRate: z.number().int().min(0).max(300).optional(),
  maxHeartRate: z.number().int().min(0).max(300).optional(),
});
export type SyncWorkoutEntry = z.infer<typeof SyncWorkoutEntrySchema>;

// ─── Bulk Sync (from mobile client) ──────────────────────────────────────────────────

export const SyncHealthDataSchema = z.object({
  steps: z.array(LogStepsSchema).max(200).optional(),
  sleep: z.array(LogSleepSchema).max(200).optional(),
  heartRate: z.array(LogHeartRateSchema).max(2000).optional(),
  weight: z.array(SyncWeightEntrySchema).max(200).optional(),
  water: z.array(SyncWaterEntrySchema).max(200).optional(),
  workouts: z.array(SyncWorkoutEntrySchema).max(100).optional(),
  source: WorkoutSessionSourceSchema,
});
export type SyncHealthData = z.infer<typeof SyncHealthDataSchema>;

export const SyncHealthDataResponseSchema = z.object({
  stepsUpserted: z.number().int(),
  sleepUpserted: z.number().int(),
  heartRateInserted: z.number().int(),
  weightUpserted: z.number().int(),
  waterUpserted: z.number().int(),
  workoutsImported: z.number().int(),
});
export type SyncHealthDataResponse = z.infer<
  typeof SyncHealthDataResponseSchema
>;

// ─── Steps Today (shorthand) ─────────────────────────────────────────────────

export const StepsTodayResponseSchema = z.object({
  steps: z.number().int(),
  goal: z.number().int(),
  percent: z.number(),
});
export type StepsTodayResponse = z.infer<typeof StepsTodayResponseSchema>;

// ─── ID param ────────────────────────────────────────────────────────────────

export const HealthLogParamsSchema = z.object({ id: z.uuid() });

// ─── Health Sync Preferences ─────────────────────────────────────────────────

export const HealthSyncPreferenceSchema = z.object({
  readSteps: z.boolean(),
  readSleep: z.boolean(),
  readHeartRate: z.boolean(),
  readWeight: z.boolean(),
  readWater: z.boolean(),
  readWorkouts: z.boolean(),
  writeWeight: z.boolean(),
  writeWater: z.boolean(),
  writeWorkouts: z.boolean(),
});
export type HealthSyncPreference = z.infer<typeof HealthSyncPreferenceSchema>;

export const UpdateHealthSyncPreferenceSchema =
  HealthSyncPreferenceSchema.partial();
export type UpdateHealthSyncPreference = z.infer<
  typeof UpdateHealthSyncPreferenceSchema
>;

export const HealthSyncPreferenceResponseSchema =
  HealthSyncPreferenceSchema.extend({
    id: z.string().uuid(),
  });
export type HealthSyncPreferenceResponse = z.infer<
  typeof HealthSyncPreferenceResponseSchema
>;

// ─── HealthKit Workout Type Mapping ──────────────────────────────────────────

/**
 * Maps Apple HealthKit HKWorkoutActivityType names (as returned by
 * @capgo/capacitor-health) to human-readable Vara workout titles.
 */
export const HEALTHKIT_WORKOUT_TYPE_MAP: Record<string, string> = {
  // Strength
  TraditionalStrengthTraining: 'Strength Training',
  FunctionalStrengthTraining: 'Functional Training',
  HighIntensityIntervalTraining: 'HIIT',
  CrossTraining: 'Cross Training',
  CoreTraining: 'Core Training',

  // Cardio
  Running: 'Running',
  Walking: 'Walking',
  Cycling: 'Cycling',
  Swimming: 'Swimming',
  Elliptical: 'Elliptical',
  Rowing: 'Rowing',
  StairClimbing: 'Stair Climbing',
  StepTraining: 'Step Training',
  JumpRope: 'Jump Rope',
  Dance: 'Dance',
  Kickboxing: 'Kickboxing',
  MartialArts: 'Martial Arts',
  Boxing: 'Boxing',

  // Flexibility / Recovery
  Yoga: 'Yoga',
  Pilates: 'Pilates',
  MindAndBody: 'Mind & Body',
  Stretching: 'Stretching',
  CoolDown: 'Cool Down',

  // Sports
  Basketball: 'Basketball',
  Soccer: 'Soccer',
  Tennis: 'Tennis',
  Volleyball: 'Volleyball',
  Baseball: 'Baseball',
  Golf: 'Golf',
  Hiking: 'Hiking',
  Climbing: 'Climbing',
  TableTennis: 'Table Tennis',
  Badminton: 'Badminton',
  Racquetball: 'Racquetball',
  Squash: 'Squash',
  Wrestling: 'Wrestling',

  // Other
  Other: 'Workout',
  MixedCardio: 'Mixed Cardio',
  PreparationAndRecovery: 'Warm Up / Recovery',
  Flexibility: 'Flexibility',
  Handball: 'Handball',
  Lacrosse: 'Lacrosse',
  Rugby: 'Rugby',
  Skating: 'Skating',
  Skiing: 'Skiing',
  Snowboarding: 'Snowboarding',
  SurfingSports: 'Surfing',
  WaterFitness: 'Water Fitness',
  WaterPolo: 'Water Polo',
};

/**
 * Convert a HealthKit/Health Connect workout type string to a readable title.
 */
export function mapWorkoutType(raw: string | undefined | null): string {
  if (!raw) return 'Workout';
  return HEALTHKIT_WORKOUT_TYPE_MAP[raw] ?? titleCase(raw);
}

function titleCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}
export type HealthLogParams = z.infer<typeof HealthLogParamsSchema>;

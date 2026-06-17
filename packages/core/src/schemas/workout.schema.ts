import { z } from 'zod';

// Privacy enum for workout sessions
export const WorkoutPrivacySchema = z.enum(['PRIVATE', 'FRIENDS', 'PUBLIC']);
export type WorkoutPrivacy = z.infer<typeof WorkoutPrivacySchema>;

export const WorkoutSessionSourceSchema = z.enum([
  'MANUAL',
  'STRAVA',
  'APPLE_WATCH',
  'FITBIT',
  'WHOOP',
  'OURA_RING',
  'GOOGLE_PIXEL_WATCH',
  'SAMSUNG_GALAXY_WATCH',
  'APPLE_HEALTH',
  'GOOGLE_FIT',
  'SAMSUNG_HEALTH',
  'WITHINGS',
  'MYFITNESSPAL',
  'LOSE_IT',
  'GARMIN',
  'OTHER',
]);
export type WorkoutSessionSource = z.infer<typeof WorkoutSessionSourceSchema>;

// Workout Set Schema
export const WorkoutSetSchema = z.object({
  id: z.uuid(),
  workoutId: z.uuid(),
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().nullable(),
  weight: z.number().positive().nullable(),
  duration: z.number().int().positive().nullable(), // seconds
  distance: z.number().positive().nullable(), // meters
  created: z.iso.datetime(),
  updated: z.iso.datetime(),
});

export type WorkoutSet = z.infer<typeof WorkoutSetSchema>;

// Exercise info embedded in workout
export const WorkoutExerciseSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  difficulty: z.string(),
});

export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>;

// Workout Response Schema (within a session)
export const WorkoutResponseSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  exerciseId: z.uuid(),
  exercise: WorkoutExerciseSchema,
  sets: z.array(WorkoutSetSchema),
  sortOrder: z.number().int(),
  completed: z.boolean(),
  created: z.iso.datetime(),
  updated: z.iso.datetime(),
});

export type WorkoutResponse = z.infer<typeof WorkoutResponseSchema>;

// New PR notification (returned when creating session)
export const NewPRSchema = z.object({
  exerciseId: z.uuid(),
  exerciseName: z.string(),
  type: z.string(),
  value: z.number(),
  previousValue: z.number().optional(),
  improvement: z.number().optional(), // percentage improvement
});

export type NewPR = z.infer<typeof NewPRSchema>;

// External summary data from imported activities (Strava, Apple Health, etc.)
export const ExternalSummarySchema = z
  .object({
    distanceMeters: z.number().optional(),
    movingTimeSeconds: z.number().optional(),
    elapsedTimeSeconds: z.number().optional(),
    elevationGainMeters: z.number().optional(),
    averageSpeedMps: z.number().optional(),
    maxSpeedMps: z.number().optional(),
    averagePaceSecPerKm: z.number().optional(),
    calories: z.number().optional(),
    kudosCount: z.number().optional(),
    averageHeartRate: z.number().optional(),
    maxHeartRate: z.number().optional(),
    polyline: z.string().optional(),
  })
  .passthrough();

export type ExternalSummary = z.infer<typeof ExternalSummarySchema>;

// Workout Session Response Schema
export const WorkoutSessionResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string().nullable(),
  performed: z.iso.datetime(),
  privacy: WorkoutPrivacySchema,
  source: WorkoutSessionSourceSchema,
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
  gymId: z.uuid().nullable(),
  externalProvider: z.string().nullable(),
  externalActivityId: z.string().nullable(),
  externalActivityType: z.string().nullable(),
  externalSummary: ExternalSummarySchema.nullable(),
  importedAt: z.iso.datetime().nullable(),
  workouts: z.array(WorkoutResponseSchema),
  notes: z.string().nullable(), // Decrypted notes (only for owner)
  created: z.iso.datetime(),
  updated: z.iso.datetime(),
});

export type WorkoutSessionResponse = z.infer<
  typeof WorkoutSessionResponseSchema
>;

// Create Session Response (includes new PRs)
export const CreateSessionResponseSchema = WorkoutSessionResponseSchema.extend({
  newPRs: z.array(NewPRSchema),
});

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

// Feed-safe session (no notes, limited info)
export const WorkoutSessionFeedSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string().nullable(),
  performed: z.iso.datetime(),
  privacy: WorkoutPrivacySchema,
  source: WorkoutSessionSourceSchema,
  externalActivityType: z.string().nullable(),
  externalSummary: ExternalSummarySchema.nullable(),
  workoutCount: z.number().int(),
  exerciseNames: z.array(z.string()),
  totalSets: z.number().int(),
  totalVolume: z.number().nullable(), // total weight lifted
  created: z.iso.datetime(),
});

export type WorkoutSessionFeed = z.infer<typeof WorkoutSessionFeedSchema>;

// Workout Session List Response
export const WorkoutSessionListDataSchema = z.object({
  items: z.array(WorkoutSessionResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type WorkoutSessionListData = z.infer<
  typeof WorkoutSessionListDataSchema
>;

// Legacy Workout List Response (for backwards compatibility during migration)
export const WorkoutListDataSchema = z.object({
  items: z.array(WorkoutResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type WorkoutListData = z.infer<typeof WorkoutListDataSchema>;

// Create Workout Set Input
export const CreateWorkoutSetSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  duration: z.number().int().positive().optional(), // seconds
  distance: z.number().positive().optional(), // meters
});

export type CreateWorkoutSet = z.infer<typeof CreateWorkoutSetSchema>;

// Create Workout Input (within a session)
export const CreateWorkoutSchema = z.object({
  exerciseId: z.uuid(),
  sets: z.array(CreateWorkoutSetSchema).min(1),
  sortOrder: z.number().int().optional(),
});

export type CreateWorkout = z.infer<typeof CreateWorkoutSchema>;

// Create Workout Session Input
export const CreateWorkoutSessionSchema = z.object({
  title: z.string().max(100).optional(),
  performed: z.iso.datetime().optional(),
  privacy: WorkoutPrivacySchema.default('PRIVATE'),
  notes: z.string().optional(),
  gymId: z.uuid().optional(),
  workouts: z.array(CreateWorkoutSchema).min(1),
});

export type CreateWorkoutSession = z.infer<typeof CreateWorkoutSessionSchema>;

// Update Workout Session Input
export const UpdateWorkoutSessionSchema = z.object({
  title: z.string().max(100).nullable().optional(),
  performed: z.iso.datetime().optional(),
  privacy: WorkoutPrivacySchema.optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateWorkoutSession = z.infer<typeof UpdateWorkoutSessionSchema>;

// Update Workout Input (within session)
export const UpdateWorkoutSchema = z.object({
  sortOrder: z.number().int().optional(),
});

export type UpdateWorkout = z.infer<typeof UpdateWorkoutSchema>;

// Add Set to Workout
export const AddWorkoutSetSchema = CreateWorkoutSetSchema;
export type AddWorkoutSet = z.infer<typeof AddWorkoutSetSchema>;

// Update Set
export const UpdateWorkoutSetSchema = z.object({
  reps: z.number().int().positive().nullish(),
  weight: z.number().positive().nullish(),
  duration: z.number().int().positive().nullish(),
  distance: z.number().positive().nullish(),
});

export type UpdateWorkoutSet = z.infer<typeof UpdateWorkoutSetSchema>;

// Query Params for Sessions
export const WorkoutSessionQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  privacy: WorkoutPrivacySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type WorkoutSessionQuery = z.infer<typeof WorkoutSessionQuerySchema>;

// Legacy Query Params (for backwards compatibility)
export const WorkoutQuerySchema = z.object({
  exerciseId: z.uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type WorkoutQuery = z.infer<typeof WorkoutQuerySchema>;

// Params
export const WorkoutSessionParamsSchema = z.object({
  sessionId: z.uuid(),
});

export type WorkoutSessionParams = z.infer<typeof WorkoutSessionParamsSchema>;

export const WorkoutParamsSchema = z.object({
  sessionId: z.uuid(),
  workoutId: z.uuid(),
});

export type WorkoutParams = z.infer<typeof WorkoutParamsSchema>;

export const WorkoutSetParamsSchema = z.object({
  sessionId: z.uuid(),
  workoutId: z.uuid(),
  setId: z.uuid(),
});

export type WorkoutSetParams = z.infer<typeof WorkoutSetParamsSchema>;

// Workout Stats
export const WorkoutStatsSchema = z.object({
  totalSessions: z.number(),
  totalWorkouts: z.number(),
  totalSets: z.number(),
  totalVolume: z.number(), // total weight lifted
  totalCalories: z.number().optional(),
  totalDistanceMeters: z.number().optional(),
  totalDurationSeconds: z.number().optional(),
  exerciseBreakdown: z.array(
    z.object({
      exerciseId: z.uuid(),
      exerciseName: z.string(),
      count: z.number(),
    }),
  ),
});

export type WorkoutStats = z.infer<typeof WorkoutStatsSchema>;

// Personal Record Types
export const PRTypeSchema = z.enum([
  'MAX_WEIGHT',
  'MAX_REPS',
  'MAX_VOLUME',
  'BEST_PACE',
  'LONGEST_DIST',
  'LONGEST_TIME',
]);

export type PRType = z.infer<typeof PRTypeSchema>;

// Personal Record Response Schema
export const PersonalRecordResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  exerciseId: z.uuid(),
  exercise: WorkoutExerciseSchema,
  type: PRTypeSchema,
  value: z.number(),
  reps: z.number().int().nullable(),
  weight: z.number().nullable(),
  duration: z.number().int().nullable(),
  distance: z.number().nullable(),
  workoutSetId: z.uuid().nullable(),
  achievedAt: z.iso.datetime(),
  created: z.iso.datetime(),
  updated: z.iso.datetime(),
});

export type PersonalRecordResponse = z.infer<
  typeof PersonalRecordResponseSchema
>;

// Personal Record List Response
export const PersonalRecordListDataSchema = z.object({
  items: z.array(PersonalRecordResponseSchema),
  total: z.number(),
});

export type PersonalRecordListData = z.infer<
  typeof PersonalRecordListDataSchema
>;

// Create/Update Personal Record Input (manual entry)
export const CreatePersonalRecordSchema = z.object({
  exerciseId: z.uuid(),
  type: PRTypeSchema,
  value: z.number().positive(),
  reps: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  duration: z.number().int().positive().optional(),
  distance: z.number().positive().optional(),
  achievedAt: z.iso.datetime().optional(),
});

export type CreatePersonalRecord = z.infer<typeof CreatePersonalRecordSchema>;

export const UpdatePersonalRecordSchema = z.object({
  value: z.number().positive().optional(),
  reps: z.number().int().positive().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  distance: z.number().positive().nullable().optional(),
  achievedAt: z.iso.datetime().optional(),
});

export type UpdatePersonalRecord = z.infer<typeof UpdatePersonalRecordSchema>;

// Query params for Personal Records
export const PersonalRecordQuerySchema = z.object({
  exerciseId: z.uuid().optional(),
  type: PRTypeSchema.optional(),
});

export type PersonalRecordQuery = z.infer<typeof PersonalRecordQuerySchema>;

// Params for PR endpoints
export const PersonalRecordParamsSchema = z.object({
  prId: z.uuid(),
});

export type PersonalRecordParams = z.infer<typeof PersonalRecordParamsSchema>;

// PR Check result (used when logging sets)
export const PRCheckResultSchema = z.object({
  isNewPR: z.boolean(),
  type: PRTypeSchema.optional(),
  previousValue: z.number().optional(),
  newValue: z.number().optional(),
  improvement: z.number().optional(), // percentage improvement
});

export type PRCheckResult = z.infer<typeof PRCheckResultSchema>;

// Daily Activity Schema (for activity graph / heat map)
export const DailyActivitySchema = z.object({
  date: z.string(), // YYYY-MM-DD format
  workouts: z.number().int(),
  sets: z.number().int(),
  volume: z.number(), // total weight lifted
});

export type DailyActivity = z.infer<typeof DailyActivitySchema>;

export const ActivityDataSchema = z.object({
  items: z.array(DailyActivitySchema),
  startDate: z.string(),
  endDate: z.string(),
});

export type ActivityData = z.infer<typeof ActivityDataSchema>;

// Muscle Breakdown Schema (for muscle focus / training balance)
export const MuscleBreakdownItemSchema = z.object({
  muscleGroup: z.string(),
  fullName: z.string(),
  sets: z.number().int(),
  workouts: z.number().int(),
  percentage: z.number(), // percentage of total
});

export type MuscleBreakdownItem = z.infer<typeof MuscleBreakdownItemSchema>;

export const MuscleBreakdownDataSchema = z.object({
  items: z.array(MuscleBreakdownItemSchema),
  totalSets: z.number().int(),
  totalWorkouts: z.number().int(),
});

export type MuscleBreakdownData = z.infer<typeof MuscleBreakdownDataSchema>;

// Recent Workouts Summary Schema (for dashboard)
export const RecentWorkoutSummarySchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  performed: z.iso.datetime(),
  exerciseCount: z.number().int(),
  setCount: z.number().int(),
  totalVolume: z.number(),
  exerciseNames: z.array(z.string()),
  duration: z.number().int().nullable(), // minutes, if tracked
});

export type RecentWorkoutSummary = z.infer<typeof RecentWorkoutSummarySchema>;

// Muscle Targets Schema (weekly set targets per muscle group)
export const MuscleTargetsSchema = z.object({
  CHEST: z.number().int().min(0).optional(),
  BACK: z.number().int().min(0).optional(),
  SHOULDERS: z.number().int().min(0).optional(),
  ARMS: z.number().int().min(0).optional(), // Combined BICEPS + TRICEPS
  BICEPS: z.number().int().min(0).optional(),
  TRICEPS: z.number().int().min(0).optional(),
  LEGS: z.number().int().min(0).optional(),
  GLUTES: z.number().int().min(0).optional(),
  CORE: z.number().int().min(0).optional(),
});

export type MuscleTargets = z.infer<typeof MuscleTargetsSchema>;

// Workout Goal Response Schema
export const WorkoutGoalResponseSchema = z.object({
  id: z.uuid(),
  weeklyWorkouts: z.number().int().min(0).max(14),
  muscleTargets: MuscleTargetsSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type WorkoutGoalResponse = z.infer<typeof WorkoutGoalResponseSchema>;

// Upsert Workout Goal Schema
export const UpsertWorkoutGoalSchema = z.object({
  weeklyWorkouts: z.number().int().min(0).max(14).optional(),
  muscleTargets: MuscleTargetsSchema.optional(),
});

export type UpsertWorkoutGoal = z.infer<typeof UpsertWorkoutGoalSchema>;

// ============================================================================
// NEW: Active Session Support (Gym location + timing)
// ============================================================================

// Basic gym info for session
export const SessionGymSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export type SessionGym = z.infer<typeof SessionGymSchema>;

// Extended Workout Session Response Schema (with gym object and active state)
export const WorkoutSessionExtendedSchema = WorkoutSessionResponseSchema.extend(
  {
    gym: SessionGymSchema.nullable(),
    isActive: z.boolean(), // true if endedAt is null
  },
);

export type WorkoutSessionExtended = z.infer<
  typeof WorkoutSessionExtendedSchema
>;

// Active session (no workouts array - lighter for checking)
export const ActiveSessionSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  gym: SessionGymSchema.nullable(),
  startedAt: z.iso.datetime(),
  workoutCount: z.number().int(),
  exerciseNames: z.array(z.string()),
});

export type ActiveSession = z.infer<typeof ActiveSessionSchema>;

// Start Session Input
export const StartSessionSchema = z.object({
  gymId: z.uuid().optional(), // null = private/home workout
  title: z.string().max(100).optional(),
  privacy: WorkoutPrivacySchema.default('PRIVATE'),
});

export type StartSession = z.infer<typeof StartSessionSchema>;

// End Session Input
export const EndSessionSchema = z.object({
  title: z.string().max(100).optional(),
  privacy: WorkoutPrivacySchema.optional(),
  notes: z.string().optional(),
});

export type EndSession = z.infer<typeof EndSessionSchema>;

// Add Workout to Active Session
export const AddWorkoutToSessionSchema = z.object({
  exerciseId: z.uuid(),
  sets: z.array(CreateWorkoutSetSchema).min(1),
});

export type AddWorkoutToSession = z.infer<typeof AddWorkoutToSessionSchema>;

// Update Workout in Session (replace all sets)
export const UpdateWorkoutInSessionSchema = z.object({
  sets: z.array(CreateWorkoutSetSchema).min(1).optional(),
  sortOrder: z.number().int().optional(),
  completed: z.boolean().optional(),
});

export type UpdateWorkoutInSession = z.infer<
  typeof UpdateWorkoutInSessionSchema
>;

// ============================================================================
// Gym Stats (for live training data)
// ============================================================================

// User currently training at gym
export const TrainingUserSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  gym: SessionGymSchema.nullable(),
  currentExercise: z.string().nullable(),
  sessionStartedAt: z.iso.datetime(),
});

export type TrainingUser = z.infer<typeof TrainingUserSchema>;

// Trending exercise at gym
export const TrendingExerciseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  count: z.number().int(), // sessions today with this exercise
});

export type TrendingExercise = z.infer<typeof TrendingExerciseSchema>;

// Peak hours data (aggregate by hour)
export const PeakHoursSchema = z.object({
  hour: z.number().int().min(0).max(23),
  count: z.number().int(),
});

export type PeakHours = z.infer<typeof PeakHoursSchema>;

// Gym Stats Response - social view of gym activity
export const GymStatsResponseSchema = z.object({
  trainingNow: z.array(TrainingUserSchema), // users training at user's gyms
  peakHours: z.array(PeakHoursSchema), // busiest hours
  trendingExercises: z.array(TrendingExerciseSchema), // top exercises today
});

export type GymStatsResponse = z.infer<typeof GymStatsResponseSchema>;

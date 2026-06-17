import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const WorkoutPlanVisibilitySchema = z.enum([
  'PRIVATE',
  'CLIENTS',
  'PUBLIC',
]);
export type WorkoutPlanVisibility = z.infer<typeof WorkoutPlanVisibilitySchema>;

export const WorkoutPlanAssignmentStatusSchema = z.enum([
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
]);
export type WorkoutPlanAssignmentStatus = z.infer<
  typeof WorkoutPlanAssignmentStatusSchema
>;

export const DayOfWeekSchema = z.enum([
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
]);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

// Day of week order for sorting
export const DAY_ORDER: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

// ============================================
// Exercise Set (individual set in an exercise)
// ============================================

export const WorkoutPlanExerciseSetSchema = z.object({
  id: z.uuid(),
  planExerciseId: z.uuid(),
  setNumber: z.number().int().positive(),
  targetReps: z.number().int().positive().nullable(),
  targetWeight: z.number().positive().nullable(),
  targetRpe: z.number().int().min(1).max(10).nullable(),
  targetDuration: z.number().int().positive().nullable(),
  restAfter: z.number().int().positive().nullable(),
  setType: z.string().nullable(),
  notes: z.string().nullable(),
});
export type WorkoutPlanExerciseSet = z.infer<
  typeof WorkoutPlanExerciseSetSchema
>;

// ============================================
// Exercise in Plan
// ============================================

export const WorkoutPlanExerciseSchema = z.object({
  id: z.uuid(),
  exerciseId: z.uuid(),
  exercise: z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
    category: z.string(),
    difficulty: z.string(),
  }),
  targetSets: z.number().int().positive().nullable(),
  targetRepsMin: z.number().int().positive().nullable(),
  targetRepsMax: z.number().int().positive().nullable(),
  targetWeight: z.number().positive().nullable(),
  targetRpe: z.number().int().min(1).max(10).nullable(),
  targetDuration: z.number().int().positive().nullable(),
  targetDistance: z.number().positive().nullable(),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
  sets: z.array(WorkoutPlanExerciseSetSchema).default([]),
});
export type WorkoutPlanExercise = z.infer<typeof WorkoutPlanExerciseSchema>;

// ============================================
// Day in Plan
// ============================================

export const WorkoutPlanDaySchema = z.object({
  id: z.uuid(),
  dayOfWeek: DayOfWeekSchema,
  name: z.string().nullable(),
  isRestDay: z.boolean(),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
  exercises: z.array(WorkoutPlanExerciseSchema),
});
export type WorkoutPlanDay = z.infer<typeof WorkoutPlanDaySchema>;

// ============================================
// Workout Plan Response
// ============================================

export const WorkoutPlanCreatorSchema = z.object({
  id: z.uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const WorkoutPlanResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: WorkoutPlanVisibilitySchema,
  durationWeeks: z.number().int().positive().nullable(),
  difficulty: z.string().nullable(),
  copyCount: z.number().int(),
  assignCount: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  creator: WorkoutPlanCreatorSchema,
  coachId: z.uuid().nullable(),
  copiedFromId: z.uuid().nullable(),
  days: z.array(WorkoutPlanDaySchema),
});
export type WorkoutPlanResponse = z.infer<typeof WorkoutPlanResponseSchema>;

// List item (minimal for listings)
export const WorkoutPlanListItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: WorkoutPlanVisibilitySchema,
  durationWeeks: z.number().int().positive().nullable(),
  difficulty: z.string().nullable(),
  copyCount: z.number().int(),
  assignCount: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  creator: WorkoutPlanCreatorSchema,
  coachId: z.uuid().nullable(),
  dayCount: z.number().int(), // Number of non-rest days
});
export type WorkoutPlanListItem = z.infer<typeof WorkoutPlanListItemSchema>;

// ============================================
// Assignment Response
// ============================================

export const WorkoutPlanAssignmentResponseSchema = z.object({
  id: z.uuid(),
  planId: z.uuid(),
  plan: z.object({
    id: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    durationWeeks: z.number().int().positive().nullable(),
  }),
  clientId: z.uuid(),
  client: z
    .object({
      id: z.uuid(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  assignedById: z.uuid().nullable(),
  assignedBy: z
    .object({
      id: z.uuid(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  bookingId: z.uuid().nullable(),
  status: WorkoutPlanAssignmentStatusSchema,
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable(),
  coachNotes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  completedDaysCount: z.number().int(),
  currentWeek: z.number().int(),
});
export type WorkoutPlanAssignmentResponse = z.infer<
  typeof WorkoutPlanAssignmentResponseSchema
>;

// ============================================
// Create/Update Schemas
// ============================================

export const CreateWorkoutPlanExerciseSchema = z.object({
  exerciseId: z.uuid(),
  targetSets: z.number().int().positive().optional(),
  targetRepsMin: z.number().int().positive().optional(),
  targetRepsMax: z.number().int().positive().optional(),
  targetWeight: z.number().positive().optional(),
  targetRpe: z.number().int().min(1).max(10).optional(),
  targetDuration: z.number().int().positive().optional(),
  targetDistance: z.number().positive().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().default(0),
});
export type CreateWorkoutPlanExercise = z.infer<
  typeof CreateWorkoutPlanExerciseSchema
>;

export const CreateWorkoutPlanDaySchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  name: z.string().optional(),
  isRestDay: z.boolean().default(false),
  notes: z.string().optional(),
  exercises: z.array(CreateWorkoutPlanExerciseSchema).default([]),
});
export type CreateWorkoutPlanDay = z.infer<typeof CreateWorkoutPlanDaySchema>;

export const CreateWorkoutPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  visibility: WorkoutPlanVisibilitySchema.default('PRIVATE'),
  durationWeeks: z.number().int().positive().optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  days: z.array(CreateWorkoutPlanDaySchema).max(7).default([]),
});
export type CreateWorkoutPlan = z.infer<typeof CreateWorkoutPlanSchema>;

export const UpdateWorkoutPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  visibility: WorkoutPlanVisibilitySchema.optional(),
  durationWeeks: z.number().int().positive().nullable().optional(),
  difficulty: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});
export type UpdateWorkoutPlan = z.infer<typeof UpdateWorkoutPlanSchema>;

export const UpdateWorkoutPlanDaySchema = z.object({
  name: z.string().nullable().optional(),
  isRestDay: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});
export type UpdateWorkoutPlanDay = z.infer<typeof UpdateWorkoutPlanDaySchema>;

export const UpdateWorkoutPlanExerciseSchema = z.object({
  targetSets: z.number().int().positive().nullable().optional(),
  targetRepsMin: z.number().int().positive().nullable().optional(),
  targetRepsMax: z.number().int().positive().nullable().optional(),
  targetWeight: z.number().positive().nullable().optional(),
  targetRpe: z.number().int().min(1).max(10).nullable().optional(),
  targetDuration: z.number().int().positive().nullable().optional(),
  targetDistance: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateWorkoutPlanExercise = z.infer<
  typeof UpdateWorkoutPlanExerciseSchema
>;

// ============================================
// Exercise Set Create/Update
// ============================================

export const CreateExerciseSetSchema = z.object({
  setNumber: z.number().int().positive(),
  targetReps: z.number().int().positive().optional(),
  targetWeight: z.number().positive().optional(),
  targetRpe: z.number().int().min(1).max(10).optional(),
  targetDuration: z.number().int().positive().optional(),
  restAfter: z.number().int().positive().optional(),
  setType: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateExerciseSet = z.infer<typeof CreateExerciseSetSchema>;

export const UpdateExerciseSetSchema = z.object({
  targetReps: z.number().int().positive().nullable().optional(),
  targetWeight: z.number().positive().nullable().optional(),
  targetRpe: z.number().int().min(1).max(10).nullable().optional(),
  targetDuration: z.number().int().positive().nullable().optional(),
  restAfter: z.number().int().positive().nullable().optional(),
  setType: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type UpdateExerciseSet = z.infer<typeof UpdateExerciseSetSchema>;

// ============================================
// Assignment Create/Update
// ============================================

export const AssignWorkoutPlanSchema = z.object({
  planId: z.uuid(),
  clientId: z.uuid(),
  bookingId: z.uuid().optional(),
  coachNotes: z.string().max(2000).optional(),
  startDate: z.iso.datetime().optional(),
});
export type AssignWorkoutPlan = z.infer<typeof AssignWorkoutPlanSchema>;

export const UpdateAssignmentStatusSchema = z.object({
  status: WorkoutPlanAssignmentStatusSchema,
});
export type UpdateAssignmentStatus = z.infer<
  typeof UpdateAssignmentStatusSchema
>;

// ============================================
// Query Schemas
// ============================================

export const WorkoutPlanQuerySchema = z.object({
  visibility: WorkoutPlanVisibilitySchema.optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  search: z.string().optional(),
  coachOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});
export type WorkoutPlanQuery = z.infer<typeof WorkoutPlanQuerySchema>;

export const WorkoutPlanAssignmentQuerySchema = z.object({
  status: WorkoutPlanAssignmentStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});
export type WorkoutPlanAssignmentQuery = z.infer<
  typeof WorkoutPlanAssignmentQuerySchema
>;

// ============================================
// List Data (paginated responses)
// ============================================

export const WorkoutPlanListDataSchema = z.object({
  plans: z.array(WorkoutPlanListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});
export type WorkoutPlanListData = z.infer<typeof WorkoutPlanListDataSchema>;

export const WorkoutPlanAssignmentListDataSchema = z.object({
  assignments: z.array(WorkoutPlanAssignmentResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});
export type WorkoutPlanAssignmentListData = z.infer<
  typeof WorkoutPlanAssignmentListDataSchema
>;

// ============================================
// Start Workout from Plan
// ============================================

export const StartPlanWorkoutSchema = z.object({
  assignmentId: z.uuid(),
  dayOfWeek: DayOfWeekSchema,
  gymId: z.uuid().optional(),
});
export type StartPlanWorkout = z.infer<typeof StartPlanWorkoutSchema>;

export const CompletePlanDaySchema = z.object({
  assignmentId: z.uuid(),
  dayOfWeek: DayOfWeekSchema,
  sessionId: z.uuid(),
});
export type CompletePlanDay = z.infer<typeof CompletePlanDaySchema>;

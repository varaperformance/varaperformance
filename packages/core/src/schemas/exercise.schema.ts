import { z } from 'zod';

// Enums matching Prisma
export const ExerciseCategorySchema = z.enum([
  'STRENGTH',
  'CARDIO',
  'FLEXIBILITY',
  'PLYOMETRICS',
  'BODYWEIGHT',
]);

export const MuscleGroupSchema = z.enum([
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'LEGS',
  'GLUTES',
  'CORE',
  'FULL_BODY',
]);

export const EquipmentSchema = z.enum([
  'BARBELL',
  'DUMBBELL',
  'CABLE',
  'MACHINE',
  'BODYWEIGHT',
  'KETTLEBELL',
  'RESISTANCE_BAND',
  'CARDIO_MACHINE',
]);

export const ExerciseDifficultySchema = z.enum([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);

// Query schema for filtering exercises
export const ExerciseQuerySchema = z.object({
  category: ExerciseCategorySchema.optional(),
  muscleGroup: MuscleGroupSchema.optional(),
  equipment: EquipmentSchema.optional(),
  difficulty: ExerciseDifficultySchema.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// Params for single exercise lookup
export const ExerciseParamsSchema = z.object({
  slug: z.string().min(1).max(100),
});

export const ExerciseIdParamsSchema = z.object({
  id: z.uuid(),
});

// Admin CRUD schemas
export const CreateExerciseSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  category: ExerciseCategorySchema,
  difficulty: ExerciseDifficultySchema,
  description: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(),
  variations: z.array(z.string()).optional(),
  videoUrl: z.url().optional(),
  thumbnailUrl: z.url().optional(),
  isActive: z.boolean().default(true),
  muscleGroups: z.array(MuscleGroupSchema).optional(),
  equipment: z.array(EquipmentSchema).optional(),
});

export const UpdateExerciseSchema = CreateExerciseSchema.partial();

// Inferred types (also exported from interfaces for convenience)
export type ExerciseCategoryEnum = z.infer<typeof ExerciseCategorySchema>;
export type MuscleGroupEnum = z.infer<typeof MuscleGroupSchema>;
export type EquipmentEnum = z.infer<typeof EquipmentSchema>;
export type ExerciseDifficultyEnum = z.infer<typeof ExerciseDifficultySchema>;
export type ExerciseQuery = z.infer<typeof ExerciseQuerySchema>;
export type ExerciseParams = z.infer<typeof ExerciseParamsSchema>;
export type ExerciseIdParams = z.infer<typeof ExerciseIdParamsSchema>;
export type CreateExercise = z.infer<typeof CreateExerciseSchema>;
export type UpdateExercise = z.infer<typeof UpdateExerciseSchema>;

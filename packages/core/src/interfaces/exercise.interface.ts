/**
 * Exercise Library Interfaces
 * Public exercise reference data
 */

export type ExerciseCategory =
  | 'STRENGTH'
  | 'CARDIO'
  | 'FLEXIBILITY'
  | 'PLYOMETRICS'
  | 'BODYWEIGHT';

export type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'LEGS'
  | 'GLUTES'
  | 'CORE'
  | 'FULL_BODY';

export type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'CABLE'
  | 'MACHINE'
  | 'BODYWEIGHT'
  | 'KETTLEBELL'
  | 'RESISTANCE_BAND'
  | 'CARDIO_MACHINE';

export type ExerciseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/**
 * Muscle group with primary/secondary designation
 */
export interface ExerciseMuscleGroupData {
  muscleGroup: MuscleGroup;
  isPrimary: boolean;
}

/**
 * Equipment with required/optional designation
 */
export interface ExerciseEquipmentData {
  equipment: Equipment;
  isRequired: boolean;
}

/**
 * Full exercise response
 */
export interface ExerciseResponse {
  id: string;
  slug: string;
  name: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  description: string;
  instructions: string[];
  tips: string[];
  variations: string[];
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  muscleGroups: ExerciseMuscleGroupData[];
  equipment: ExerciseEquipmentData[];
}

/**
 * Exercise list response with pagination
 */
export interface ExerciseListData {
  items: ExerciseResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Exercise filter options
 */
export interface ExerciseFilters {
  category?: ExerciseCategory;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
  difficulty?: ExerciseDifficulty;
  search?: string;
  page?: number;
  limit?: number;
}

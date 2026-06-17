/**
 * Prisma select for exercise - basic info
 */
export const exerciseSelect = {
  id: true,
  slug: true,
  name: true,
  category: true,
  difficulty: true,
  description: true,
  instructions: true,
  tips: true,
  variations: true,
  videoUrl: true,
  thumbnailUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};
export type ExerciseSelect = typeof exerciseSelect;

/**
 * Prisma select for exercise with relations
 */
export const exerciseWithRelationsSelect = {
  id: true,
  slug: true,
  name: true,
  category: true,
  difficulty: true,
  description: true,
  instructions: true,
  tips: true,
  variations: true,
  videoUrl: true,
  thumbnailUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  muscleGroups: {
    select: {
      muscleGroup: true,
      isPrimary: true,
    },
  },
  equipmentNeeded: {
    select: {
      equipment: true,
      isRequired: true,
    },
  },
};
export type ExerciseWithRelationsSelect = typeof exerciseWithRelationsSelect;

/**
 * Prisma select for exercise list (minimal fields)
 */
export const exerciseListSelect = {
  id: true,
  slug: true,
  name: true,
  category: true,
  difficulty: true,
  thumbnailUrl: true,
};
export type ExerciseListSelect = typeof exerciseListSelect;

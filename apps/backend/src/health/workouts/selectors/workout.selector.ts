/**
 * Prisma select for workout set
 */
export const workoutSetSelect = {
  id: true,
  workoutId: true,
  setNumber: true,
  reps: true,
  weight: true,
  duration: true,
  distance: true,
  created: true,
  updated: true,
} as const;
export type WorkoutSetSelect = typeof workoutSetSelect;

/**
 * Prisma select for exercise info (internal to workouts module)
 */
const exerciseSelectInternal = {
  id: true,
  slug: true,
  name: true,
  category: true,
  difficulty: true,
} as const;

/**
 * Prisma select for workout (within session)
 */
export const workoutSelect = {
  id: true,
  sessionId: true,
  exerciseId: true,
  exercise: {
    select: exerciseSelectInternal,
  },
  sets: {
    select: workoutSetSelect,
    orderBy: { setNumber: 'asc' as const },
  },
  sortOrder: true,
  completed: true,
  created: true,
  updated: true,
} as const;
export type WorkoutSelect = typeof workoutSelect;

/**
 * Prisma select for workout session - includes workouts and encrypted notes
 */
export const workoutSessionSelect = {
  id: true,
  userId: true,
  title: true,
  performed: true,
  privacy: true,
  source: true,
  gymId: true,
  startedAt: true,
  endedAt: true,
  externalProvider: true,
  externalActivityId: true,
  externalActivityType: true,
  externalSummary: true,
  importedAt: true,
  workouts: {
    select: workoutSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
  encryptedNotes: true,
  notesIv: true,
  notesAuthTag: true,
  notesWrappedKey: true,
  created: true,
  updated: true,
} as const;
export type WorkoutSessionSelect = typeof workoutSessionSelect;

/**
 * Prisma select for session feed (no encrypted notes)
 */
export const workoutSessionFeedSelect = {
  id: true,
  userId: true,
  title: true,
  performed: true,
  privacy: true,
  source: true,
  externalActivityType: true,
  externalSummary: true,
  workouts: {
    select: {
      id: true,
      exercise: {
        select: {
          name: true,
        },
      },
      sets: {
        select: {
          reps: true,
          weight: true,
        },
      },
    },
  },
  created: true,
} as const;
export type WorkoutSessionFeedSelect = typeof workoutSessionFeedSelect;

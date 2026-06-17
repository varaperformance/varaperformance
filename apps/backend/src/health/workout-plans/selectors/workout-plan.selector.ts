/**
 * Prisma select for workout plan list items (minimal for listings)
 */
export const workoutPlanListSelect = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  durationWeeks: true,
  difficulty: true,
  copyCount: true,
  assignCount: true,
  isActive: true,
  createdAt: true,
  coachId: true,
  creator: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  days: {
    where: { isRestDay: false },
    select: { id: true },
  },
};
export type WorkoutPlanListSelect = typeof workoutPlanListSelect;

/**
 * Prisma select for full workout plan details
 */
export const workoutPlanDetailSelect = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  durationWeeks: true,
  difficulty: true,
  copyCount: true,
  assignCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  coachId: true,
  copiedFromId: true,
  creator: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  days: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      dayOfWeek: true,
      name: true,
      isRestDay: true,
      notes: true,
      sortOrder: true,
      exercises: {
        orderBy: { sortOrder: 'asc' as const },
        select: {
          id: true,
          exerciseId: true,
          targetSets: true,
          targetRepsMin: true,
          targetRepsMax: true,
          targetWeight: true,
          targetRpe: true,
          targetDuration: true,
          targetDistance: true,
          notes: true,
          sortOrder: true,
          exercise: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              difficulty: true,
            },
          },
          sets: {
            orderBy: { setNumber: 'asc' as const },
            select: {
              id: true,
              planExerciseId: true,
              setNumber: true,
              targetReps: true,
              targetWeight: true,
              targetRpe: true,
              targetDuration: true,
              restAfter: true,
              setType: true,
              notes: true,
            },
          },
        },
      },
    },
  },
};
export type WorkoutPlanDetailSelect = typeof workoutPlanDetailSelect;

/**
 * Prisma select for workout plan assignment list
 */
export const workoutPlanAssignmentListSelect = {
  id: true,
  planId: true,
  clientId: true,
  assignedById: true,
  bookingId: true,
  status: true,
  startDate: true,
  endDate: true,
  coachNotes: true,
  createdAt: true,
  plan: {
    select: {
      id: true,
      name: true,
      description: true,
      durationWeeks: true,
    },
  },
  client: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  assignedBy: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  completedDays: {
    select: { id: true },
  },
};
export type WorkoutPlanAssignmentListSelect =
  typeof workoutPlanAssignmentListSelect;

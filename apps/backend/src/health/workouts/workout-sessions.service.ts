import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { Prisma } from '@generated/prisma';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import {
  workoutSessionSelect,
  workoutSessionFeedSelect,
} from './selectors/workout.selector';
import { PersonalRecordsService } from './personal-records.service';
import { AchievementsService } from '../../achievements/achievements.service';
import {
  parseLocalDate,
  formatDateString,
  formatDateInTimezone,
  getDaysAgoInTimezone,
  getTodayInTimezone,
  type CreateWorkoutSession,
  type UpdateWorkoutSession,
  type CreateWorkout,
  type AddWorkoutSet,
  type UpdateWorkoutSet,
  type UpdateWorkoutInSession,
  type WorkoutSessionQuery,
  type WorkoutSessionResponse,
  type WorkoutSessionListData,
  type WorkoutSessionFeed,
  type WorkoutSessionSource,
  type WorkoutStats,
  type WorkoutPrivacy,
  type SuccessResponse,
  type ErrorResponse,
  type CreateSessionResponse,
  type StartSession,
  type EndSession,
  type ActiveSession,
  type WorkoutSessionExtended,
} from '@varaperformance/core';

/** Type for session with all fields from workoutSessionSelect */
type SessionWithSelect = Prisma.WorkoutSessionGetPayload<{
  select: typeof workoutSessionSelect;
}>;

/** Type for session feed fields from workoutSessionFeedSelect */
type SessionFeedWithSelect = Prisma.WorkoutSessionGetPayload<{
  select: typeof workoutSessionFeedSelect;
}>;

type PRAchievement = {
  exerciseId: string;
  exerciseName: string;
  type: string;
  value: number;
  previousValue?: number;
  improvement?: number;
};

export interface WorkoutMotivationQuoteResponse {
  quote: string;
  author: string;
  source: 'library' | 'fallback';
}

const FALLBACK_WORKOUT_QUOTES: Array<{ quote: string; author: string }> = [
  {
    quote:
      'Strength does not come from winning. Your struggles develop your strengths. When you go through hardships and decide not to surrender, that is strength.',
    author: 'Arnold Schwarzenegger',
  },
  {
    quote: 'The last three or four reps is what makes the muscle grow.',
    author: 'Arnold Schwarzenegger',
  },
  {
    quote:
      'The only place where success comes before work is in the dictionary.',
    author: 'Vidal Sassoon',
  },
  {
    quote:
      'Success usually comes to those who are too busy to be looking for it.',
    author: 'Henry David Thoreau',
  },
  {
    quote: 'The pain you feel today will be the strength you feel tomorrow.',
    author: 'Arnold Schwarzenegger',
  },
  {
    quote:
      "I hated every minute of training, but I said, don't quit. Suffer now and live the rest of your life as a champion.",
    author: 'Muhammad Ali',
  },
  {
    quote: 'The body achieves what the mind believes.',
    author: 'Napoleon Hill',
  },
  {
    quote: 'What hurts today makes you stronger tomorrow.',
    author: 'Jay Cutler',
  },
  {
    quote:
      'The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.',
    author: 'Arnold Schwarzenegger',
  },
  {
    quote:
      'If something stands between you and your success, move it. Never be denied.',
    author: 'Dwayne Johnson',
  },
];

@Injectable()
export class WorkoutSessionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    @Inject(forwardRef(() => PersonalRecordsService))
    private readonly prService: PersonalRecordsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * Create a new workout session with workouts and sets
   */
  async create(
    userId: string,
    data: CreateWorkoutSession,
  ): Promise<SuccessResponse<CreateSessionResponse> | ErrorResponse> {
    // Verify all exercises exist
    const exerciseIds = data.workouts.map((w) => w.exerciseId);
    const exercises = await this.db.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true },
    });

    if (exercises.length !== exerciseIds.length) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'One or more exercises not found',
        },
      };
    }

    // Encrypt notes if provided
    const encryptedNotesData = data.notes
      ? this.encryptNotes(data.notes)
      : {
          encryptedNotes: null,
          notesIv: null,
          notesAuthTag: null,
          notesWrappedKey: null,
        };

    // Verify gym exists if provided
    if (data.gymId) {
      const gym = await this.db.gym.findUnique({
        where: { id: data.gymId },
        select: { id: true },
      });
      if (!gym) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gym not found',
          },
        };
      }
    }

    const session = await this.db.workoutSession.create({
      data: {
        userId,
        title: data.title,
        performed: data.performed ? new Date(data.performed) : new Date(),
        privacy: data.privacy,
        gymId: data.gymId ?? null,
        encryptedNotes: encryptedNotesData.encryptedNotes,
        notesIv: encryptedNotesData.notesIv,
        notesAuthTag: encryptedNotesData.notesAuthTag,
        notesWrappedKey: encryptedNotesData.notesWrappedKey,
        workouts: {
          create: data.workouts.map((workout, index) => ({
            exerciseId: workout.exerciseId,
            sortOrder: workout.sortOrder ?? index,
            sets: {
              create: workout.sets.map((set) => ({
                setNumber: set.setNumber,
                reps: set.reps ?? null,
                weight: set.weight ?? null,
                duration: set.duration ?? null,
                distance: set.distance ?? null,
              })),
            },
          })),
        },
      },
      select: workoutSessionSelect,
    });

    // Check for PRs on all sets and collect results
    const newPRs = await this.checkSessionPRs(userId, session);

    // Check WORKOUT achievements (e.g. First Workout, Century Club)
    const sessionCount = await this.db.workoutSession.count({
      where: { userId },
    });
    this.achievementsService
      .checkAndAward(userId, 'WORKOUT', sessionCount)
      .catch(() => {});

    return {
      success: true,
      data: {
        ...this.formatSessionResponse(session),
        newPRs,
      },
    };
  }

  /**
   * Check all sets in a session for personal records
   * Returns array of new PRs achieved
   */
  private async checkSessionPRs(
    userId: string,
    session: SessionWithSelect,
  ): Promise<PRAchievement[]> {
    const newPRs: PRAchievement[] = [];

    for (const workout of session.workouts) {
      for (const set of workout.sets) {
        const results = await this.prService.checkAndUpdatePR(
          userId,
          workout.exerciseId,
          workout.exercise.category,
          {
            reps: set.reps ?? undefined,
            weight: set.weight ?? undefined,
            duration: set.duration ?? undefined,
            distance: set.distance ?? undefined,
          },
          set.id,
        );

        for (const result of results) {
          if (result.isNewPR && result.type && result.newValue !== undefined) {
            newPRs.push({
              exerciseId: workout.exerciseId,
              exerciseName: workout.exercise.name,
              type: result.type,
              value: result.newValue,
              previousValue: result.previousValue,
              improvement: result.improvement,
            });
          }
        }
      }
    }

    return newPRs;
  }

  private async getSessionAchievedPRs(
    userId: string,
    sessionId: string,
  ): Promise<PRAchievement[]> {
    const records = await this.db.personalRecord.findMany({
      where: {
        userId,
        workoutSet: {
          workout: {
            sessionId,
          },
        },
      },
      select: {
        exerciseId: true,
        type: true,
        value: true,
        exercise: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        achievedAt: 'desc',
      },
    });

    return records.map((record) => ({
      exerciseId: record.exerciseId,
      exerciseName: record.exercise.name,
      type: record.type,
      value: record.value,
    }));
  }

  private mergeUniquePRs(...groups: PRAchievement[][]): PRAchievement[] {
    const byKey = new Map<string, PRAchievement>();
    for (const group of groups) {
      for (const pr of group) {
        byKey.set(`${pr.exerciseId}:${pr.type}`, pr);
      }
    }
    return Array.from(byKey.values());
  }

  /**
   * Get workout sessions for a user
   */
  async findAll(
    userId: string,
    query: WorkoutSessionQuery,
  ): Promise<SuccessResponse<WorkoutSessionListData>> {
    const { startDate, endDate, privacy, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };

    if (privacy) {
      where.privacy = privacy;
    }

    if (startDate || endDate) {
      where.performed = {};
      if (startDate)
        (where.performed as Record<string, Date>).gte =
          parseLocalDate(startDate);
      if (endDate) {
        (where.performed as Record<string, Date>).lte = parseLocalDate(
          endDate,
          true,
        );
      }
    }

    const [sessions, total] = await Promise.all([
      this.db.workoutSession.findMany({
        where,
        select: workoutSessionSelect,
        orderBy: { performed: 'desc' },
        skip,
        take: limit,
      }),
      this.db.workoutSession.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: sessions.map((s) => this.formatSessionResponse(s)),
        total,
        page,
        limit,
      },
    };
  }

  /**
   * Get a single workout session by ID
   */
  async findOne(
    userId: string,
    sessionId: string,
  ): Promise<SuccessResponse<WorkoutSessionResponse> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: workoutSessionSelect,
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    return { success: true, data: this.formatSessionResponse(session) };
  }

  /**
   * Get sessions for feed (public or friends, no notes)
   */
  async getFeed(
    viewerUserId: string,
    targetUserId: string,
    isFriend: boolean,
    page = 1,
    limit = 20,
  ): Promise<SuccessResponse<{ items: WorkoutSessionFeed[]; total: number }>> {
    const skip = (page - 1) * limit;

    // Determine which privacy levels to show
    const privacyLevels: WorkoutPrivacy[] = ['PUBLIC'];
    if (isFriend) {
      privacyLevels.push('FRIENDS');
    }
    // User can see all their own sessions
    if (viewerUserId === targetUserId) {
      privacyLevels.push('PRIVATE');
    }

    const where = {
      userId: targetUserId,
      privacy: { in: privacyLevels },
    };

    const [sessions, total] = await Promise.all([
      this.db.workoutSession.findMany({
        where,
        select: workoutSessionFeedSelect,
        orderBy: { performed: 'desc' },
        skip,
        take: limit,
      }),
      this.db.workoutSession.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: sessions.map((s) => this.formatFeedResponse(s)),
        total,
      },
    };
  }

  /**
   * Update a workout session
   */
  async update(
    userId: string,
    sessionId: string,
    data: UpdateWorkoutSession,
  ): Promise<SuccessResponse<WorkoutSessionResponse> | ErrorResponse> {
    const existing = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.performed) updateData.performed = new Date(data.performed);
    if (data.privacy) updateData.privacy = data.privacy;

    // Handle notes encryption
    if (data.notes !== undefined) {
      if (data.notes) {
        const encrypted = this.encryptNotes(data.notes);
        updateData.encryptedNotes = encrypted.encryptedNotes;
        updateData.notesIv = encrypted.notesIv;
        updateData.notesAuthTag = encrypted.notesAuthTag;
        updateData.notesWrappedKey = encrypted.notesWrappedKey;
      } else {
        updateData.encryptedNotes = null;
        updateData.notesIv = null;
        updateData.notesAuthTag = null;
        updateData.notesWrappedKey = null;
      }
    }

    const session = await this.db.workoutSession.update({
      where: { id: sessionId },
      data: updateData,
      select: workoutSessionSelect,
    });

    return { success: true, data: this.formatSessionResponse(session) };
  }

  /**
   * Delete a workout session
   */
  async remove(
    userId: string,
    sessionId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    await this.db.workoutSession.delete({ where: { id: sessionId } });

    return { success: true, data: { deleted: true } };
  }

  /**
   * Add a workout to an existing session
   */
  async addWorkout(
    userId: string,
    sessionId: string,
    data: CreateWorkout,
  ): Promise<SuccessResponse<WorkoutSessionResponse> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, workouts: { select: { sortOrder: true } } },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    // Verify exercise exists
    const exercise = await this.db.exercise.findUniqueOrThrow({
      where: { id: data.exerciseId },
      select: { id: true },
    });

    if (!exercise) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exercise not found' },
      };
    }

    // Get next sort order
    const maxSortOrder = Math.max(
      0,
      ...session.workouts.map((w) => w.sortOrder),
    );

    const createdWorkout = await this.db.workout.create({
      data: {
        sessionId,
        exerciseId: data.exerciseId,
        sortOrder: data.sortOrder ?? maxSortOrder + 1,
        sets: {
          create: data.sets.map((set) => ({
            setNumber: set.setNumber,
            reps: set.reps ?? null,
            weight: set.weight ?? null,
            duration: set.duration ?? null,
            distance: set.distance ?? null,
          })),
        },
      },
      include: {
        exercise: { select: { name: true, category: true } },
        sets: true,
      },
    });

    // Check for PRs on the new workout's sets
    const newPRs: Array<{
      exerciseId: string;
      exerciseName: string;
      type: string;
      value: number;
      previousValue?: number;
      improvement?: number;
    }> = [];

    for (const set of createdWorkout.sets) {
      const results = await this.prService.checkAndUpdatePR(
        userId,
        createdWorkout.exerciseId,
        createdWorkout.exercise.category,
        {
          reps: set.reps ?? undefined,
          weight: set.weight ?? undefined,
          duration: set.duration ?? undefined,
          distance: set.distance ?? undefined,
        },
        set.id,
      );

      for (const result of results) {
        if (result.isNewPR && result.type && result.newValue !== undefined) {
          newPRs.push({
            exerciseId: createdWorkout.exerciseId,
            exerciseName: createdWorkout.exercise.name,
            type: result.type,
            value: result.newValue,
            previousValue: result.previousValue,
            improvement: result.improvement,
          });
        }
      }
    }

    const updated = await this.db.workoutSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: workoutSessionSelect,
    });

    return {
      success: true,
      data: {
        ...this.formatSessionResponse(updated),
        newPRs,
      } as WorkoutSessionResponse & { newPRs: typeof newPRs },
    };
  }

  /**
   * Remove a workout from a session
   */
  async removeWorkout(
    userId: string,
    sessionId: string,
    workoutId: string,
  ): Promise<SuccessResponse<WorkoutSessionResponse> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    const workout = await this.db.workout.findFirst({
      where: { id: workoutId, sessionId },
      select: { id: true },
    });

    if (!workout) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout not found' },
      };
    }

    await this.db.workout.delete({ where: { id: workoutId } });

    const updated = await this.db.workoutSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: workoutSessionSelect,
    });

    return { success: true, data: this.formatSessionResponse(updated) };
  }

  /**
   * Update a workout (e.g., mark as completed)
   */
  async updateWorkout(
    userId: string,
    sessionId: string,
    workoutId: string,
    data: UpdateWorkoutInSession,
  ): Promise<SuccessResponse<WorkoutSessionResponse> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    const workout = await this.db.workout.findFirst({
      where: { id: workoutId, sessionId },
      select: { id: true },
    });

    if (!workout) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout not found' },
      };
    }

    await this.db.workout.update({
      where: { id: workoutId },
      data: {
        completed: data.completed,
        sortOrder: data.sortOrder,
      },
    });

    const updated = await this.db.workoutSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: workoutSessionSelect,
    });

    return { success: true, data: this.formatSessionResponse(updated) };
  }

  /**
   * Add a set to a workout
   */
  async addSet(
    userId: string,
    sessionId: string,
    workoutId: string,
    data: AddWorkoutSet,
  ): Promise<SuccessResponse<WorkoutSessionResponse> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    const workout = await this.db.workout.findFirst({
      where: { id: workoutId, sessionId },
      select: { id: true },
    });

    if (!workout) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout not found' },
      };
    }

    await this.db.workoutSet.create({
      data: {
        workoutId,
        setNumber: data.setNumber,
        reps: data.reps ?? null,
        weight: data.weight ?? null,
        duration: data.duration ?? null,
        distance: data.distance ?? null,
      },
    });

    const updated = await this.db.workoutSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: workoutSessionSelect,
    });

    return { success: true, data: this.formatSessionResponse(updated) };
  }

  /**
   * Update a set
   */
  async updateSet(
    userId: string,
    sessionId: string,
    workoutId: string,
    setId: string,
    data: UpdateWorkoutSet,
  ): Promise<SuccessResponse<WorkoutSessionResponse> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    const workout = await this.db.workout.findFirst({
      where: { id: workoutId, sessionId },
      select: { id: true },
    });

    if (!workout) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout not found' },
      };
    }

    const set = await this.db.workoutSet.findFirst({
      where: { id: setId, workoutId },
      select: { id: true },
    });

    if (!set) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Set not found' },
      };
    }

    await this.db.workoutSet.update({
      where: { id: setId },
      data: {
        reps: data.reps,
        weight: data.weight,
        duration: data.duration,
        distance: data.distance,
      },
    });

    const updated = await this.db.workoutSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: workoutSessionSelect,
    });

    return { success: true, data: this.formatSessionResponse(updated) };
  }

  /**
   * Remove a set
   */
  async removeSet(
    userId: string,
    sessionId: string,
    workoutId: string,
    setId: string,
  ): Promise<SuccessResponse<WorkoutSessionResponse> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    const workout = await this.db.workout.findFirst({
      where: { id: workoutId, sessionId },
      select: { id: true },
    });

    if (!workout) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout not found' },
      };
    }

    const set = await this.db.workoutSet.findFirst({
      where: { id: setId, workoutId },
      select: { id: true },
    });

    if (!set) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Set not found' },
      };
    }

    await this.db.workoutSet.delete({ where: { id: setId } });

    const updated = await this.db.workoutSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: workoutSessionSelect,
    });

    return { success: true, data: this.formatSessionResponse(updated) };
  }

  /**
   * Get workout stats for a user
   */
  async getStats(userId: string): Promise<SuccessResponse<WorkoutStats>> {
    const [totalSessions, totalWorkouts, setAggregation, exerciseBreakdown] =
      await Promise.all([
        this.db.workoutSession.count({ where: { userId } }),
        this.db.workout.count({ where: { session: { userId } } }),
        this.db.workoutSet.aggregate({
          where: { workout: { session: { userId } } },
          _count: { _all: true },
        }),
        this.db.workout.groupBy({
          by: ['exerciseId'],
          where: { session: { userId } },
          _count: { _all: true },
        }),
      ]);

    // Get exercise names
    const exerciseIds = exerciseBreakdown.map((e) => e.exerciseId);
    const exercises = await this.db.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, name: true },
    });
    const exerciseMap = new Map(exercises.map((e) => [e.id, e.name]));

    // Calculate total volume (sum of weight * reps for each set)
    const allSets = await this.db.workoutSet.findMany({
      where: { workout: { session: { userId } } },
      select: { weight: true, reps: true },
    });
    const totalVolume = allSets.reduce((acc, set) => {
      if (set.weight && set.reps) {
        return acc + set.weight * set.reps;
      }
      return acc;
    }, 0);

    // Aggregate imported session metrics from externalSummary
    const importedSessions = await this.db.workoutSession.findMany({
      where: { userId, externalSummary: { not: Prisma.DbNull } },
      select: { externalSummary: true },
    });

    let totalCalories = 0;
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    for (const session of importedSessions) {
      const summary = session.externalSummary as Record<string, unknown> | null;
      if (!summary) continue;
      if (typeof summary.calories === 'number')
        totalCalories += summary.calories;
      if (typeof summary.distanceMeters === 'number')
        totalDistanceMeters += summary.distanceMeters;
      if (typeof summary.elapsedTimeSeconds === 'number')
        totalDurationSeconds += summary.elapsedTimeSeconds;
    }

    return {
      success: true,
      data: {
        totalSessions,
        totalWorkouts,
        totalSets: setAggregation._count._all,
        totalVolume: Math.round(totalVolume * 10) / 10,
        totalCalories:
          totalCalories > 0 ? Math.round(totalCalories) : undefined,
        totalDistanceMeters:
          totalDistanceMeters > 0 ? Math.round(totalDistanceMeters) : undefined,
        totalDurationSeconds:
          totalDurationSeconds > 0
            ? Math.round(totalDurationSeconds)
            : undefined,
        exerciseBreakdown: exerciseBreakdown.map((e) => ({
          exerciseId: e.exerciseId,
          exerciseName: exerciseMap.get(e.exerciseId) || 'Unknown',
          count: e._count._all,
        })),
      },
    };
  }

  /**
   * Get user's most frequently used exercise IDs
   * Only includes exercises used at least 3 times
   */
  async getFrequentExercises(
    userId: string,
    limit = 10,
  ): Promise<SuccessResponse<{ exerciseIds: string[] }>> {
    const workouts = await this.db.workout.groupBy({
      by: ['exerciseId'],
      where: { session: { userId } },
      _count: { exerciseId: true },
      orderBy: { _count: { exerciseId: 'desc' } },
      take: limit,
    });

    // Only include exercises used at least 3 times
    const frequentExercises = workouts.filter((w) => w._count.exerciseId >= 3);

    return {
      success: true,
      data: {
        exerciseIds: frequentExercises.map((w) => w.exerciseId),
      },
    };
  }

  /**
   * Format session response with decrypted notes
   */
  private formatSessionResponse(
    session: SessionWithSelect,
  ): WorkoutSessionResponse {
    return {
      id: session.id,
      userId: session.userId,
      title: session.title,
      performed: session.performed.toISOString(),
      privacy: session.privacy as WorkoutPrivacy,
      source: session.source as WorkoutSessionSource,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      gymId: session.gymId,
      externalProvider: session.externalProvider,
      externalActivityId: session.externalActivityId,
      externalActivityType: session.externalActivityType,
      externalSummary: session.externalSummary as Record<
        string,
        unknown
      > | null,
      importedAt: session.importedAt?.toISOString() ?? null,
      workouts: session.workouts.map((workout) => ({
        id: workout.id,
        sessionId: workout.sessionId,
        exerciseId: workout.exerciseId,
        exercise: workout.exercise,
        sets: workout.sets.map((set) => ({
          id: set.id,
          workoutId: set.workoutId,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          duration: set.duration,
          distance: set.distance,
          created: set.created.toISOString(),
          updated: set.updated.toISOString(),
        })),
        sortOrder: workout.sortOrder,
        completed: workout.completed,
        created: workout.created.toISOString(),
        updated: workout.updated.toISOString(),
      })),
      notes: this.decryptNotes(session),
      created: session.created.toISOString(),
      updated: session.updated.toISOString(),
    };
  }

  /**
   * Format feed response (no notes, summary data)
   */
  private formatFeedResponse(
    session: SessionFeedWithSelect,
  ): WorkoutSessionFeed {
    const exerciseNames = session.workouts.map((w) => w.exercise.name);
    const totalSets = session.workouts.reduce(
      (acc, w) => acc + w.sets.length,
      0,
    );
    const totalVolume = session.workouts.reduce((acc, workout) => {
      return (
        acc +
        workout.sets.reduce((setAcc, set) => {
          if (set.weight && set.reps) {
            return setAcc + set.weight * set.reps;
          }
          return setAcc;
        }, 0)
      );
    }, 0);

    return {
      id: session.id,
      userId: session.userId,
      title: session.title,
      performed: session.performed.toISOString(),
      privacy: session.privacy as WorkoutPrivacy,
      source: session.source as WorkoutSessionSource,
      externalActivityType: session.externalActivityType,
      externalSummary: session.externalSummary as Record<
        string,
        unknown
      > | null,
      workoutCount: session.workouts.length,
      exerciseNames,
      totalSets,
      totalVolume: totalVolume > 0 ? Math.round(totalVolume * 10) / 10 : null,
      created: session.created.toISOString(),
    };
  }

  /**
   * Get daily activity data for activity graph / heat map
   */
  async getActivityData(
    userId: string,
    options: { days?: number; startDate?: string; endDate?: string } = {},
  ): Promise<
    SuccessResponse<{
      items: Array<{
        date: string;
        workouts: number;
        sets: number;
        volume: number;
        activityMinutes: number;
      }>;
      startDate: string;
      endDate: string;
    }>
  > {
    let startDate: Date;
    let endDate = new Date();

    if (options.startDate && options.endDate) {
      startDate = parseLocalDate(options.startDate);
      endDate = parseLocalDate(options.endDate, true);
    } else if (options.startDate) {
      startDate = parseLocalDate(options.startDate);
    } else if (options.endDate) {
      endDate = parseLocalDate(options.endDate, true);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (options.days || 365));
    } else {
      const days = options.days || 365;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Calculate days between dates for initialization
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get all sessions in the date range
    const sessions = await this.db.workoutSession.findMany({
      where: {
        userId,
        performed: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        workouts: {
          include: {
            sets: true,
          },
        },
      },
    });

    // Group by date
    const activityMap = new Map<
      string,
      {
        workouts: number;
        sets: number;
        volume: number;
        activityMinutes: number;
      }
    >();

    // Initialize all dates with zeros
    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = formatDateString(date);
      activityMap.set(dateStr, {
        workouts: 0,
        sets: 0,
        volume: 0,
        activityMinutes: 0,
      });
    }

    // Populate with actual data
    for (const session of sessions) {
      const dateStr = formatDateString(session.performed);
      const existing = activityMap.get(dateStr) || {
        workouts: 0,
        sets: 0,
        volume: 0,
        activityMinutes: 0,
      };

      let sessionSets = 0;
      let sessionVolume = 0;

      for (const workout of session.workouts) {
        sessionSets += workout.sets.length;
        for (const set of workout.sets) {
          if (set.weight && set.reps) {
            sessionVolume += set.weight * set.reps;
          }
        }
      }

      // Track activity minutes from imported sessions
      let activityMinutes = 0;
      const summary = session.externalSummary as Record<string, unknown> | null;
      if (summary) {
        const seconds =
          (typeof summary.movingTimeSeconds === 'number'
            ? summary.movingTimeSeconds
            : 0) ||
          (typeof summary.elapsedTimeSeconds === 'number'
            ? summary.elapsedTimeSeconds
            : 0);
        activityMinutes = Math.round(seconds / 60);
      }

      activityMap.set(dateStr, {
        workouts: existing.workouts + 1,
        sets: existing.sets + sessionSets,
        volume: existing.volume + sessionVolume,
        activityMinutes: existing.activityMinutes + activityMinutes,
      });
    }

    const items = Array.from(activityMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        items,
        startDate: formatDateString(startDate),
        endDate: formatDateString(endDate),
      },
    };
  }

  /**
   * Get workout breakdown by muscle group
   */
  async getMuscleBreakdown(
    userId: string,
    options: { days?: number; startDate?: string; endDate?: string } = {},
  ): Promise<
    SuccessResponse<{
      items: Array<{
        muscleGroup: string;
        fullName: string;
        sets: number;
        workouts: number;
        percentage: number;
      }>;
      totalSets: number;
      totalWorkouts: number;
    }>
  > {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const timezone = profile?.timezone || 'UTC';

    // Get all workouts with exercise muscle groups
    const workouts = await this.db.workout.findMany({
      where: {
        session: { userId },
      },
      include: {
        session: {
          select: {
            performed: true,
          },
        },
        exercise: {
          include: {
            muscleGroups: true,
          },
        },
        sets: true,
      },
    });

    const rangeStart =
      options.startDate ||
      (options.days ? getDaysAgoInTimezone(options.days, timezone) : undefined);
    const rangeEnd =
      options.endDate ||
      (options.days ? getTodayInTimezone(timezone) : undefined);

    const filteredWorkouts = workouts.filter((workout) => {
      if (!rangeStart && !rangeEnd) return true;
      const workoutDate = formatDateInTimezone(
        workout.session.performed,
        timezone,
      );
      if (rangeStart && workoutDate < rangeStart) return false;
      if (rangeEnd && workoutDate > rangeEnd) return false;
      return true;
    });

    // Aggregate by muscle group
    const muscleMap = new Map<string, { sets: number; workouts: number }>();

    const muscleFullNames: Record<string, string> = {
      CHEST: 'Chest',
      BACK: 'Back',
      SHOULDERS: 'Shoulders',
      BICEPS: 'Biceps',
      TRICEPS: 'Triceps',
      LEGS: 'Legs',
      GLUTES: 'Glutes',
      CORE: 'Core',
      FULL_BODY: 'Full Body',
    };

    let totalSets = 0;
    const totalWorkouts = filteredWorkouts.length;

    for (const workout of filteredWorkouts) {
      const setCount = workout.sets.length;
      totalSets += setCount;

      // Get all muscle groups for this exercise
      const muscleGroups = workout.exercise.muscleGroups.map(
        (mg) => mg.muscleGroup,
      );

      // If no muscle groups, skip (shouldn't happen with seeded data)
      if (muscleGroups.length === 0) continue;

      // Distribute sets across muscle groups
      for (const muscle of muscleGroups) {
        const existing = muscleMap.get(muscle) || { sets: 0, workouts: 0 };
        muscleMap.set(muscle, {
          sets: existing.sets + setCount,
          workouts: existing.workouts + 1,
        });
      }
    }

    // Convert to array with percentages
    const items = Array.from(muscleMap.entries())
      .map(([muscleGroup, data]) => ({
        muscleGroup,
        fullName: muscleFullNames[muscleGroup] || muscleGroup,
        sets: data.sets,
        workouts: data.workouts,
        percentage:
          totalSets > 0 ? Math.round((data.sets / totalSets) * 100) : 0,
      }))
      .sort((a, b) => b.sets - a.sets);

    return {
      success: true,
      data: {
        items,
        totalSets,
        totalWorkouts,
      },
    };
  }

  /**
   * Get recent workouts summary for dashboard
   * @param excludeShared - Filter out workouts already shared to Elevate
   * @param shareableOnly - Only return PUBLIC/FRIENDS workouts (not PRIVATE)
   */
  async getRecentWorkouts(
    userId: string,
    limit = 5,
    excludeShared = false,
    shareableOnly = false,
  ): Promise<
    SuccessResponse<
      Array<{
        id: string;
        title: string | null;
        performed: string;
        exerciseCount: number;
        setCount: number;
        totalVolume: number;
        exerciseNames: string[];
        duration: number | null;
        privacy: string;
      }>
    >
  > {
    const where: any = { userId };

    // Filter out workouts already shared to Elevate
    if (excludeShared) {
      where.elevatePost = { is: null };
    }

    // Only show shareable workouts (PUBLIC or FRIENDS, not PRIVATE)
    if (shareableOnly) {
      where.privacy = { in: ['PUBLIC', 'FRIENDS'] };
    }

    const sessions = await this.db.workoutSession.findMany({
      where,
      orderBy: { performed: 'desc' },
      take: limit,
      include: {
        workouts: {
          include: {
            exercise: {
              select: { name: true },
            },
            sets: true,
          },
        },
      },
    });

    const items = sessions.map((session) => {
      let setCount = 0;
      let totalVolume = 0;
      const exerciseNames: string[] = [];

      for (const workout of session.workouts) {
        exerciseNames.push(workout.exercise.name);
        setCount += workout.sets.length;
        for (const set of workout.sets) {
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      }

      return {
        id: session.id,
        title: session.title,
        performed: session.performed.toISOString(),
        exerciseCount: session.workouts.length,
        setCount,
        totalVolume: Math.round(totalVolume * 10) / 10,
        exerciseNames,
        duration: null, // We don't track duration currently
        privacy: session.privacy,
      };
    });

    return {
      success: true,
      data: items,
    };
  }

  async getMotivationQuote(): Promise<
    SuccessResponse<WorkoutMotivationQuoteResponse>
  > {
    const totalQuotes = await this.db.workoutQuote.count();

    if (totalQuotes > 0) {
      const skip = Math.floor(Math.random() * totalQuotes);
      const rows = await this.db.workoutQuote.findMany({
        take: 1,
        skip,
        select: { quote: true, author: true },
      });

      if (rows[0]) {
        return {
          success: true,
          data: {
            quote: rows[0].quote,
            author: rows[0].author,
            source: 'library',
          },
        };
      }
    }

    const fallback =
      FALLBACK_WORKOUT_QUOTES[
        Math.floor(Math.random() * FALLBACK_WORKOUT_QUOTES.length)
      ];

    return {
      success: true,
      data: {
        quote: fallback.quote,
        author: fallback.author,
        source: 'fallback',
      },
    };
  }

  // ============================================================================
  // NEW: Active Session Methods
  // ============================================================================

  /**
   * Get user's active session (session with no endedAt)
   */
  async getActiveSession(
    userId: string,
  ): Promise<SuccessResponse<ActiveSession | null>> {
    const session = await this.db.workoutSession.findFirst({
      where: {
        userId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        title: true,
        startedAt: true,
        gym: {
          select: { id: true, name: true },
        },
        workouts: {
          select: {
            exercise: { select: { name: true } },
          },
        },
      },
    });

    if (!session) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: session.id,
        title: session.title,
        gym: session.gym,
        startedAt: session.startedAt.toISOString(),
        workoutCount: session.workouts.length,
        exerciseNames: session.workouts.map((w) => w.exercise.name),
      },
    };
  }

  /**
   * Start a new workout session
   */
  async startSession(
    userId: string,
    data: StartSession,
  ): Promise<SuccessResponse<ActiveSession> | ErrorResponse> {
    // Check for existing active session
    const existing = await this.db.workoutSession.findFirst({
      where: { userId, endedAt: null },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'You already have an active session',
        },
      };
    }

    // Validate gymId if provided
    if (data.gymId) {
      // Verify user is associated with this gym
      const userGym = await this.db.profile.findFirst({
        where: {
          userId,
          gyms: { some: { id: data.gymId } },
        },
        select: { id: true },
      });

      if (!userGym) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not associated with this gym',
          },
        };
      }
    }

    const session = await this.db.workoutSession.create({
      data: {
        userId,
        title: data.title,
        privacy: data.privacy ?? 'PRIVATE',
        gymId: data.gymId ?? null,
        startedAt: new Date(),
        performed: new Date(),
        // endedAt is null (active session)
      },
      select: {
        id: true,
        title: true,
        startedAt: true,
        gym: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      success: true,
      data: {
        id: session.id,
        title: session.title,
        gym: session.gym,
        startedAt: session.startedAt.toISOString(),
        workoutCount: 0,
        exerciseNames: [],
      },
    };
  }

  /**
   * End an active session
   */
  async endSession(
    userId: string,
    sessionId: string,
    data: EndSession,
  ): Promise<SuccessResponse<WorkoutSessionExtended> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: workoutSessionSelect,
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      };
    }

    if (session.endedAt) {
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Session already ended' },
      };
    }

    // Encrypt notes if provided
    const encryptedNotesData = data.notes
      ? this.encryptNotes(data.notes)
      : {
          encryptedNotes: null,
          notesIv: null,
          notesAuthTag: null,
          notesWrappedKey: null,
        };

    const updated = await this.db.workoutSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        title: data.title ?? session.title,
        privacy: data.privacy ?? session.privacy,
        performed: session.startedAt, // Set performed to when session started
        ...(data.notes && {
          encryptedNotes: encryptedNotesData.encryptedNotes,
          notesIv: encryptedNotesData.notesIv,
          notesAuthTag: encryptedNotesData.notesAuthTag,
          notesWrappedKey: encryptedNotesData.notesWrappedKey,
        }),
      },
      select: {
        ...workoutSessionSelect,
        gym: { select: { id: true, name: true } },
      },
    });

    // Check for newly achieved PRs and include any PRs already achieved earlier in this session.
    const newlyDetectedPRs = await this.checkSessionPRs(userId, updated);
    const sessionAchievedPRs = await this.getSessionAchievedPRs(
      userId,
      sessionId,
    );
    const newPRs = this.mergeUniquePRs(newlyDetectedPRs, sessionAchievedPRs);

    const notes = this.decryptNotes(updated);

    return {
      success: true,
      data: {
        ...this.formatSessionResponse(updated),
        notes,
        gym: updated.gym,
        isActive: false,
        newPRs,
      } as WorkoutSessionExtended & { newPRs: typeof newPRs },
    };
  }

  /**
   * Encrypt notes string
   */
  private encryptNotes(notes: string): {
    encryptedNotes: Uint8Array<ArrayBuffer>;
    notesIv: Uint8Array<ArrayBuffer>;
    notesAuthTag: Uint8Array<ArrayBuffer>;
    notesWrappedKey: Uint8Array<ArrayBuffer>;
  } {
    const encrypted = this.encryption.encrypt(notes);
    return {
      encryptedNotes: new Uint8Array(
        encrypted.encryptedContent.buffer.slice(
          encrypted.encryptedContent.byteOffset,
          encrypted.encryptedContent.byteOffset +
            encrypted.encryptedContent.byteLength,
        ),
      ),
      notesIv: new Uint8Array(
        encrypted.contentIv.buffer.slice(
          encrypted.contentIv.byteOffset,
          encrypted.contentIv.byteOffset + encrypted.contentIv.byteLength,
        ),
      ),
      notesAuthTag: new Uint8Array(
        encrypted.contentAuthTag.buffer.slice(
          encrypted.contentAuthTag.byteOffset,
          encrypted.contentAuthTag.byteOffset +
            encrypted.contentAuthTag.byteLength,
        ),
      ),
      notesWrappedKey: new Uint8Array(
        encrypted.wrappedKey.buffer.slice(
          encrypted.wrappedKey.byteOffset,
          encrypted.wrappedKey.byteOffset + encrypted.wrappedKey.byteLength,
        ),
      ),
    };
  }

  /**
   * Decrypt notes from session data
   */
  private decryptNotes(session: SessionWithSelect): string | null {
    if (
      !session.encryptedNotes ||
      !session.notesIv ||
      !session.notesAuthTag ||
      !session.notesWrappedKey
    ) {
      return null;
    }
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(session.encryptedNotes),
      contentIv: Buffer.from(session.notesIv),
      contentAuthTag: Buffer.from(session.notesAuthTag),
      wrappedKey: Buffer.from(session.notesWrappedKey),
    });
    return decrypted.toString('utf8');
  }
}

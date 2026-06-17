import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { NotificationService } from '../../notification/notification.service';
import { NotificationGateway } from '../../notification/notification.gateway';
import {
  workoutPlanListSelect,
  workoutPlanDetailSelect,
  workoutPlanAssignmentListSelect,
} from './selectors/workout-plan.selector';
import type { Prisma } from '@generated/prisma';
import type {
  CreateWorkoutPlan,
  UpdateWorkoutPlan,
  CreateWorkoutPlanDay,
  UpdateWorkoutPlanDay,
  CreateWorkoutPlanExercise,
  UpdateWorkoutPlanExercise,
  CreateExerciseSet,
  UpdateExerciseSet,
  AssignWorkoutPlan,
  WorkoutPlanQuery,
  WorkoutPlanAssignmentQuery,
  WorkoutPlanResponse,
  WorkoutPlanListData,
  WorkoutPlanListItem,
  WorkoutPlanAssignmentResponse,
  WorkoutPlanAssignmentListData,
  DayOfWeek,
  SuccessResponse,
  ErrorResponse,
  StartPlanWorkout,
  CompletePlanDay,
} from '@varaperformance/core';

@Injectable()
export class WorkoutPlansService {
  private readonly logger = new Logger(WorkoutPlansService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  // ============================================
  // Workout Plans CRUD
  // ============================================

  /**
   * Get paginated list of workout plans
   */
  async findAll(
    userId: string,
    query: WorkoutPlanQuery,
  ): Promise<SuccessResponse<WorkoutPlanListData> | ErrorResponse> {
    const {
      visibility,
      difficulty,
      search,
      coachOnly,
      page = 1,
      limit = 12,
    } = query;

    // Build where clause
    const where: Prisma.WorkoutPlanWhereInput = {
      isActive: true,
      OR: [
        { creatorId: userId }, // User's own plans
        { visibility: 'PUBLIC' }, // Public plans
      ],
    };

    if (visibility) {
      where.visibility = visibility;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (coachOnly) {
      where.coachId = { not: null };
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [plans, total] = await Promise.all([
      this.db.workoutPlan.findMany({
        where,
        select: workoutPlanListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.workoutPlan.count({ where }),
    ]);

    const items: WorkoutPlanListItem[] = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      visibility: plan.visibility,
      durationWeeks: plan.durationWeeks,
      difficulty: plan.difficulty,
      copyCount: plan.copyCount,
      assignCount: plan.assignCount,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
      coachId: plan.coachId,
      creator: {
        id: plan.creator.id,
        displayName: plan.creator.profile?.displayName ?? null,
        avatarUrl: plan.creator.profile?.avatarUrl ?? null,
      },
      dayCount: plan.days.length,
    }));

    return {
      success: true,
      data: {
        plans: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's own workout plans
   */
  async findMyPlans(
    userId: string,
    query: WorkoutPlanQuery,
  ): Promise<SuccessResponse<WorkoutPlanListData> | ErrorResponse> {
    const { page = 1, limit = 12 } = query;

    const where: Prisma.WorkoutPlanWhereInput = {
      creatorId: userId,
      coachId: null, // Not coach plans
    };

    const [plans, total] = await Promise.all([
      this.db.workoutPlan.findMany({
        where,
        select: workoutPlanListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.workoutPlan.count({ where }),
    ]);

    const items: WorkoutPlanListItem[] = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      visibility: plan.visibility,
      durationWeeks: plan.durationWeeks,
      difficulty: plan.difficulty,
      copyCount: plan.copyCount,
      assignCount: plan.assignCount,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
      coachId: plan.coachId,
      creator: {
        id: plan.creator.id,
        displayName: plan.creator.profile?.displayName ?? null,
        avatarUrl: plan.creator.profile?.avatarUrl ?? null,
      },
      dayCount: plan.days.length,
    }));

    return {
      success: true,
      data: {
        plans: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a workout plan by ID
   */
  async findOne(
    userId: string,
    planId: string,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const plan = await this.db.workoutPlan.findUnique({
      where: { id: planId },
      select: workoutPlanDetailSelect,
    });

    if (!plan) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout plan not found' },
      };
    }

    // Check visibility permissions
    if (plan.visibility === 'PRIVATE' && plan.creator.id !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this plan',
        },
      };
    }

    const response: WorkoutPlanResponse = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      visibility: plan.visibility,
      durationWeeks: plan.durationWeeks,
      difficulty: plan.difficulty,
      copyCount: plan.copyCount,
      assignCount: plan.assignCount,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      coachId: plan.coachId,
      copiedFromId: plan.copiedFromId,
      creator: {
        id: plan.creator.id,
        displayName: plan.creator.profile?.displayName ?? null,
        avatarUrl: plan.creator.profile?.avatarUrl ?? null,
      },
      days: plan.days.map((day) => ({
        id: day.id,
        dayOfWeek: day.dayOfWeek as DayOfWeek,
        name: day.name,
        isRestDay: day.isRestDay,
        notes: day.notes,
        sortOrder: day.sortOrder,
        exercises: day.exercises.map((ex) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          exercise: {
            id: ex.exercise.id,
            name: ex.exercise.name,
            slug: ex.exercise.slug,
            category: ex.exercise.category,
            difficulty: ex.exercise.difficulty,
          },
          targetSets: ex.targetSets,
          targetRepsMin: ex.targetRepsMin,
          targetRepsMax: ex.targetRepsMax,
          targetWeight: ex.targetWeight,
          targetRpe: ex.targetRpe,
          targetDuration: ex.targetDuration,
          targetDistance: ex.targetDistance,
          notes: ex.notes,
          sortOrder: ex.sortOrder,
          sets: ex.sets.map((set) => ({
            id: set.id,
            planExerciseId: set.planExerciseId,
            setNumber: set.setNumber,
            targetReps: set.targetReps,
            targetWeight: set.targetWeight,
            targetRpe: set.targetRpe,
            targetDuration: set.targetDuration,
            restAfter: set.restAfter,
            setType: set.setType,
            notes: set.notes,
          })),
        })),
      })),
    };

    return { success: true, data: response };
  }

  /**
   * Create a new workout plan
   */
  async create(
    userId: string,
    data: CreateWorkoutPlan,
    coachId?: string,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    // Verify all exercises exist
    const allExerciseIds = data.days.flatMap(
      (day) => day.exercises?.map((ex) => ex.exerciseId) ?? [],
    );
    const uniqueExerciseIds = [...new Set(allExerciseIds)] as string[];

    if (uniqueExerciseIds.length > 0) {
      const exercises = await this.db.exercise.findMany({
        where: { id: { in: uniqueExerciseIds } },
        select: { id: true },
      });

      if (exercises.length !== uniqueExerciseIds.length) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'One or more exercises not found',
          },
        };
      }
    }

    // Create the plan with nested days and exercises
    const plan = await this.db.workoutPlan.create({
      data: {
        creatorId: userId,
        coachId: coachId ?? null,
        name: data.name,
        description: data.description,
        visibility: data.visibility ?? 'PRIVATE',
        durationWeeks: data.durationWeeks,
        difficulty: data.difficulty,
        days: {
          create: data.days.map((day, dayIndex) => ({
            dayOfWeek: day.dayOfWeek,
            name: day.name,
            isRestDay: day.isRestDay ?? false,
            notes: day.notes,
            sortOrder: dayIndex,
            exercises: {
              create: day.exercises.map((ex, exIndex) => ({
                exerciseId: ex.exerciseId,
                targetSets: ex.targetSets,
                targetRepsMin: ex.targetRepsMin,
                targetRepsMax: ex.targetRepsMax,
                targetWeight: ex.targetWeight,
                targetRpe: ex.targetRpe,
                targetDuration: ex.targetDuration,
                targetDistance: ex.targetDistance,
                notes: ex.notes,
                sortOrder: ex.sortOrder ?? exIndex,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });

    return this.findOne(userId, plan.id);
  }

  /**
   * Update a workout plan
   */
  async update(
    userId: string,
    planId: string,
    data: UpdateWorkoutPlan,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const plan = await this.db.workoutPlan.findUnique({
      where: { id: planId },
      select: { creatorId: true },
    });

    if (!plan) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout plan not found' },
      };
    }

    if (plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    await this.db.workoutPlan.update({
      where: { id: planId },
      data: {
        name: data.name,
        description: data.description,
        visibility: data.visibility,
        durationWeeks: data.durationWeeks,
        difficulty: data.difficulty,
        isActive: data.isActive,
      },
    });

    return this.findOne(userId, planId);
  }

  /**
   * Delete a workout plan
   */
  async delete(
    userId: string,
    planId: string,
  ): Promise<SuccessResponse<{ deleted: boolean }> | ErrorResponse> {
    const plan = await this.db.workoutPlan.findUnique({
      where: { id: planId },
      select: { creatorId: true },
    });

    if (!plan) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout plan not found' },
      };
    }

    if (plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own plans',
        },
      };
    }

    await this.db.workoutPlan.delete({ where: { id: planId } });

    return { success: true, data: { deleted: true } };
  }

  /**
   * Copy a workout plan (for users to copy public plans)
   */
  async copyPlan(
    userId: string,
    planId: string,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const original = await this.db.workoutPlan.findUnique({
      where: { id: planId },
      select: workoutPlanDetailSelect,
    });

    if (!original) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout plan not found' },
      };
    }

    // Check visibility
    if (original.visibility === 'PRIVATE' && original.creator.id !== userId) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot copy private plans' },
      };
    }

    // Create the copy
    const copy = await this.db.workoutPlan.create({
      data: {
        creatorId: userId,
        name: `${original.name} (Copy)`,
        description: original.description,
        visibility: 'PRIVATE',
        durationWeeks: original.durationWeeks,
        difficulty: original.difficulty,
        copiedFromId: planId,
        days: {
          create: original.days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            name: day.name,
            isRestDay: day.isRestDay,
            notes: day.notes,
            sortOrder: day.sortOrder,
            exercises: {
              create: day.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                targetSets: ex.targetSets,
                targetRepsMin: ex.targetRepsMin,
                targetRepsMax: ex.targetRepsMax,
                targetWeight: ex.targetWeight,
                targetRpe: ex.targetRpe,
                targetDuration: ex.targetDuration,
                targetDistance: ex.targetDistance,
                notes: ex.notes,
                sortOrder: ex.sortOrder,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });

    // Increment copy count on original
    await this.db.workoutPlan.update({
      where: { id: planId },
      data: { copyCount: { increment: 1 } },
    });

    return this.findOne(userId, copy.id);
  }

  // ============================================
  // Day Management
  // ============================================

  /**
   * Add a day to a plan
   */
  async addDay(
    userId: string,
    planId: string,
    data: CreateWorkoutPlanDay,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const plan = await this.db.workoutPlan.findUnique({
      where: { id: planId },
      select: { creatorId: true, days: { select: { dayOfWeek: true } } },
    });

    if (!plan) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout plan not found' },
      };
    }

    if (plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    // Check if day already exists
    if (plan.days.some((d) => d.dayOfWeek === data.dayOfWeek)) {
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Day already exists in this plan' },
      };
    }

    // Verify exercises exist
    if (data.exercises.length > 0) {
      const exerciseIds = data.exercises.map((ex) => ex.exerciseId);
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
    }

    await this.db.workoutPlanDay.create({
      data: {
        planId,
        dayOfWeek: data.dayOfWeek,
        name: data.name,
        isRestDay: data.isRestDay ?? false,
        notes: data.notes,
        sortOrder: plan.days.length,
        exercises: {
          create: data.exercises.map((ex, index) => ({
            exerciseId: ex.exerciseId,
            targetSets: ex.targetSets,
            targetRepsMin: ex.targetRepsMin,
            targetRepsMax: ex.targetRepsMax,
            targetWeight: ex.targetWeight,
            targetRpe: ex.targetRpe,
            targetDuration: ex.targetDuration,
            targetDistance: ex.targetDistance,
            notes: ex.notes,
            sortOrder: ex.sortOrder ?? index,
          })),
        },
      },
    });

    return this.findOne(userId, planId);
  }

  /**
   * Update a day in a plan
   */
  async updateDay(
    userId: string,
    planId: string,
    dayId: string,
    data: UpdateWorkoutPlanDay,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const day = await this.db.workoutPlanDay.findUnique({
      where: { id: dayId },
      select: { plan: { select: { creatorId: true } } },
    });

    if (!day) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Day not found' },
      };
    }

    if (day.plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    await this.db.workoutPlanDay.update({
      where: { id: dayId },
      data: {
        name: data.name,
        isRestDay: data.isRestDay,
        notes: data.notes,
      },
    });

    return this.findOne(userId, planId);
  }

  /**
   * Delete a day from a plan
   */
  async deleteDay(
    userId: string,
    planId: string,
    dayId: string,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const day = await this.db.workoutPlanDay.findUnique({
      where: { id: dayId },
      select: { plan: { select: { creatorId: true } } },
    });

    if (!day) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Day not found' },
      };
    }

    if (day.plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    await this.db.workoutPlanDay.delete({ where: { id: dayId } });

    return this.findOne(userId, planId);
  }

  // ============================================
  // Exercise Management
  // ============================================

  /**
   * Add an exercise to a day
   */
  async addExercise(
    userId: string,
    planId: string,
    dayId: string,
    data: CreateWorkoutPlanExercise,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const day = await this.db.workoutPlanDay.findUnique({
      where: { id: dayId },
      select: {
        isRestDay: true,
        plan: { select: { creatorId: true } },
        exercises: { select: { id: true } },
      },
    });

    if (!day) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Day not found' },
      };
    }

    if (day.plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    if (day.isRestDay) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Cannot add exercises to a rest day',
        },
      };
    }

    // Verify exercise exists
    const exercise = await this.db.exercise.findUnique({
      where: { id: data.exerciseId },
      select: { id: true },
    });

    if (!exercise) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exercise not found' },
      };
    }

    await this.db.workoutPlanExercise.create({
      data: {
        dayId,
        exerciseId: data.exerciseId,
        targetSets: data.targetSets,
        targetRepsMin: data.targetRepsMin,
        targetRepsMax: data.targetRepsMax,
        targetWeight: data.targetWeight,
        targetRpe: data.targetRpe,
        targetDuration: data.targetDuration,
        targetDistance: data.targetDistance,
        notes: data.notes,
        sortOrder: data.sortOrder ?? day.exercises.length,
      },
    });

    return this.findOne(userId, planId);
  }

  /**
   * Update an exercise in a day
   */
  async updateExercise(
    userId: string,
    planId: string,
    dayId: string,
    exerciseId: string,
    data: UpdateWorkoutPlanExercise,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const planExercise = await this.db.workoutPlanExercise.findUnique({
      where: { id: exerciseId },
      select: { day: { select: { plan: { select: { creatorId: true } } } } },
    });

    if (!planExercise) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exercise not found in plan' },
      };
    }

    if (planExercise.day.plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    await this.db.workoutPlanExercise.update({
      where: { id: exerciseId },
      data: {
        targetSets: data.targetSets,
        targetRepsMin: data.targetRepsMin,
        targetRepsMax: data.targetRepsMax,
        targetWeight: data.targetWeight,
        targetRpe: data.targetRpe,
        targetDuration: data.targetDuration,
        targetDistance: data.targetDistance,
        notes: data.notes,
        sortOrder: data.sortOrder,
      },
    });

    return this.findOne(userId, planId);
  }

  /**
   * Delete an exercise from a day
   */
  async deleteExercise(
    userId: string,
    planId: string,
    dayId: string,
    exerciseId: string,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const planExercise = await this.db.workoutPlanExercise.findUnique({
      where: { id: exerciseId },
      select: { day: { select: { plan: { select: { creatorId: true } } } } },
    });

    if (!planExercise) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exercise not found in plan' },
      };
    }

    if (planExercise.day.plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    await this.db.workoutPlanExercise.delete({ where: { id: exerciseId } });

    return this.findOne(userId, planId);
  }

  // ============================================
  // Exercise Sets (individual sets per exercise)
  // ============================================

  /**
   * Add a set to an exercise
   */
  async addSet(
    userId: string,
    planId: string,
    dayId: string,
    exerciseId: string,
    data: CreateExerciseSet,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const planExercise = await this.db.workoutPlanExercise.findUnique({
      where: { id: exerciseId },
      select: { day: { select: { plan: { select: { creatorId: true } } } } },
    });

    if (!planExercise) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exercise not found in plan' },
      };
    }

    if (planExercise.day.plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    await this.db.workoutPlanExerciseSet.create({
      data: {
        planExerciseId: exerciseId,
        setNumber: data.setNumber,
        targetReps: data.targetReps,
        targetWeight: data.targetWeight,
        targetRpe: data.targetRpe,
        targetDuration: data.targetDuration,
        restAfter: data.restAfter,
        setType: data.setType,
        notes: data.notes,
      },
    });

    return this.findOne(userId, planId);
  }

  /**
   * Update a set
   */
  async updateSet(
    userId: string,
    planId: string,
    dayId: string,
    exerciseId: string,
    setId: string,
    data: UpdateExerciseSet,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const set = await this.db.workoutPlanExerciseSet.findUnique({
      where: { id: setId },
      select: {
        planExercise: {
          select: {
            day: { select: { plan: { select: { creatorId: true } } } },
          },
        },
      },
    });

    if (!set) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Set not found' },
      };
    }

    if (set.planExercise.day.plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    await this.db.workoutPlanExerciseSet.update({
      where: { id: setId },
      data: {
        targetReps: data.targetReps,
        targetWeight: data.targetWeight,
        targetRpe: data.targetRpe,
        targetDuration: data.targetDuration,
        restAfter: data.restAfter,
        setType: data.setType,
        notes: data.notes,
      },
    });

    return this.findOne(userId, planId);
  }

  /**
   * Delete a set
   */
  async deleteSet(
    userId: string,
    planId: string,
    dayId: string,
    exerciseId: string,
    setId: string,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const set = await this.db.workoutPlanExerciseSet.findUnique({
      where: { id: setId },
      select: {
        planExercise: {
          select: {
            day: { select: { plan: { select: { creatorId: true } } } },
          },
        },
      },
    });

    if (!set) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Set not found' },
      };
    }

    if (set.planExercise.day.plan.creatorId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own plans',
        },
      };
    }

    await this.db.workoutPlanExerciseSet.delete({ where: { id: setId } });

    return this.findOne(userId, planId);
  }

  // ============================================
  // Assignments (Coach -> Client)
  // ============================================

  /**
   * Assign a workout plan to a client
   */
  async assignPlan(
    coachUserId: string,
    data: AssignWorkoutPlan,
  ): Promise<SuccessResponse<WorkoutPlanAssignmentResponse> | ErrorResponse> {
    // Verify coach owns the plan
    const plan = await this.db.workoutPlan.findUnique({
      where: { id: data.planId },
      select: {
        id: true,
        name: true,
        creatorId: true,
        coachId: true,
        coach: { select: { userId: true } },
      },
    });

    if (!plan) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout plan not found' },
      };
    }

    // Verify the coach created this plan
    if (plan.creatorId !== coachUserId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only assign your own plans',
        },
      };
    }

    // Verify client exists and has a booking with this coach
    const booking = data.bookingId
      ? await this.db.booking.findFirst({
          where: {
            id: data.bookingId,
            userId: data.clientId,
            coach: { userId: coachUserId },
            status: 'CONFIRMED',
          },
          select: { id: true },
        })
      : await this.db.booking.findFirst({
          where: {
            userId: data.clientId,
            coach: { userId: coachUserId },
            status: 'CONFIRMED',
          },
          select: { id: true },
        });

    if (!booking) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Client not found or no active coaching relationship',
        },
      };
    }

    // Check if client already has an active assignment for this plan
    const existingAssignment = await this.db.workoutPlanAssignment.findFirst({
      where: {
        planId: data.planId,
        clientId: data.clientId,
        status: 'ACTIVE',
      },
    });

    if (existingAssignment) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Client already has an active assignment for this plan',
        },
      };
    }

    // Create the assignment
    const assignment = await this.db.workoutPlanAssignment.create({
      data: {
        planId: data.planId,
        clientId: data.clientId,
        assignedById: coachUserId,
        bookingId: booking.id,
        coachNotes: data.coachNotes,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
      },
      select: { id: true },
    });

    // Increment assign count
    await this.db.workoutPlan.update({
      where: { id: data.planId },
      data: { assignCount: { increment: 1 } },
    });

    // Send notification to client
    // Send notification to client
    const notification = await this.notificationService.create({
      userId: data.clientId,
      type: 'WORKOUT_PLAN_ASSIGNED',
      title: 'New Workout Plan Assigned',
      body: `Your coach assigned you a new workout plan: "${plan.name}"`,
      actionUrl: `/health/workout-plans/assignments/${assignment.id}`,
      data: {
        planId: data.planId,
        planName: plan.name,
        assignmentId: assignment.id,
      },
    });

    // Push real-time notification via WebSocket
    if (notification) {
      this.notificationGateway.sendToUser(data.clientId, notification);
    }

    return this.getAssignment(data.clientId, assignment.id);
  }

  /**
   * Get assignments for a user (plans assigned to them)
   */
  async getMyAssignments(
    userId: string,
    query: WorkoutPlanAssignmentQuery,
  ): Promise<SuccessResponse<WorkoutPlanAssignmentListData> | ErrorResponse> {
    const { status, page = 1, limit = 12 } = query;

    const where: Prisma.WorkoutPlanAssignmentWhereInput = {
      clientId: userId,
      ...(status && { status }),
    };

    const [assignments, total] = await Promise.all([
      this.db.workoutPlanAssignment.findMany({
        where,
        select: workoutPlanAssignmentListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.workoutPlanAssignment.count({ where }),
    ]);

    const items: WorkoutPlanAssignmentResponse[] = assignments.map((a) =>
      this.mapAssignment(a),
    );

    return {
      success: true,
      data: {
        assignments: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get assignments made by a coach (plans they assigned to clients)
   */
  async getCoachAssignments(
    coachUserId: string,
    query: WorkoutPlanAssignmentQuery,
  ): Promise<SuccessResponse<WorkoutPlanAssignmentListData> | ErrorResponse> {
    const { status, page = 1, limit = 12 } = query;

    const where: Prisma.WorkoutPlanAssignmentWhereInput = {
      assignedById: coachUserId,
      ...(status && { status }),
    };

    const [assignments, total] = await Promise.all([
      this.db.workoutPlanAssignment.findMany({
        where,
        select: workoutPlanAssignmentListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.workoutPlanAssignment.count({ where }),
    ]);

    const items: WorkoutPlanAssignmentResponse[] = assignments.map((a) =>
      this.mapAssignment(a),
    );

    return {
      success: true,
      data: {
        assignments: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single assignment
   */
  async getAssignment(
    userId: string,
    assignmentId: string,
  ): Promise<SuccessResponse<WorkoutPlanAssignmentResponse> | ErrorResponse> {
    const assignment = await this.db.workoutPlanAssignment.findUnique({
      where: { id: assignmentId },
      select: workoutPlanAssignmentListSelect,
    });

    if (!assignment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found' },
      };
    }

    // Verify user has access (is client or assigned by them)
    if (assignment.clientId !== userId && assignment.assignedById !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this assignment',
        },
      };
    }

    return { success: true, data: this.mapAssignment(assignment) };
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    userId: string,
    assignmentId: string,
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED',
  ): Promise<SuccessResponse<WorkoutPlanAssignmentResponse> | ErrorResponse> {
    const assignment = await this.db.workoutPlanAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        clientId: true,
        assignedById: true,
        planId: true,
        status: true,
      },
    });

    if (!assignment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found' },
      };
    }

    // Both client and coach can update status
    if (assignment.clientId !== userId && assignment.assignedById !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You cannot modify this assignment',
        },
      };
    }

    const updateData: Prisma.WorkoutPlanAssignmentUpdateInput = { status };

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      updateData.endDate = new Date();

      // Decrement assign count if moving from active
      if (assignment.status === 'ACTIVE') {
        await this.db.workoutPlan.update({
          where: { id: assignment.planId },
          data: { assignCount: { decrement: 1 } },
        });
      }
    }

    await this.db.workoutPlanAssignment.update({
      where: { id: assignmentId },
      data: updateData,
    });

    return this.getAssignment(userId, assignmentId);
  }

  /**
   * Self-assign a plan (user following their own or a copied plan)
   */
  async selfAssign(
    userId: string,
    planId: string,
  ): Promise<SuccessResponse<WorkoutPlanAssignmentResponse> | ErrorResponse> {
    const plan = await this.db.workoutPlan.findUnique({
      where: { id: planId },
      select: { id: true, creatorId: true, visibility: true },
    });

    if (!plan) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout plan not found' },
      };
    }

    // Check if user can access this plan
    if (plan.visibility === 'PRIVATE' && plan.creatorId !== userId) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot follow private plans' },
      };
    }

    // Check for existing active assignment
    const existing = await this.db.workoutPlanAssignment.findFirst({
      where: {
        planId,
        clientId: userId,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'You are already following this plan',
        },
      };
    }

    const assignment = await this.db.workoutPlanAssignment.create({
      data: {
        planId,
        clientId: userId,
        assignedById: null, // Self-assigned
        status: 'ACTIVE',
        startDate: new Date(),
      },
      select: { id: true },
    });

    // Increment assign count
    await this.db.workoutPlan.update({
      where: { id: planId },
      data: { assignCount: { increment: 1 } },
    });

    return this.getAssignment(userId, assignment.id);
  }

  // ============================================
  // Coach Plan Management
  // ============================================

  /**
   * Start a workout from an assigned plan day.
   * Creates a new workout session pre-populated with exercises from the plan.
   */
  async startPlanWorkout(
    userId: string,
    data: StartPlanWorkout,
  ): Promise<
    | SuccessResponse<{
        sessionId: string;
        dayId: string;
        exercises: Array<{
          exerciseId: string;
          name: string;
          category: string;
          sets: number[];
          targetReps?: number;
          targetWeight?: number;
        }>;
      }>
    | ErrorResponse
  > {
    // Get the assignment and verify user access
    const assignment = await this.db.workoutPlanAssignment.findUnique({
      where: { id: data.assignmentId },
      select: {
        id: true,
        clientId: true,
        status: true,
        startDate: true,
        plan: {
          select: {
            id: true,
            name: true,
            days: {
              where: { dayOfWeek: data.dayOfWeek },
              select: {
                id: true,
                name: true,
                dayOfWeek: true,
                isRestDay: true,
                exercises: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    exerciseId: true,
                    exercise: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                    targetSets: true,
                    targetRepsMin: true,
                    targetRepsMax: true,
                    targetWeight: true,
                    targetDuration: true,
                    sets: {
                      orderBy: { setNumber: 'asc' },
                      select: {
                        id: true,
                        setNumber: true,
                        targetReps: true,
                        targetWeight: true,
                        targetDuration: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found' },
      };
    }

    if (assignment.clientId !== userId) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'This is not your assignment' },
      };
    }

    if (assignment.status !== 'ACTIVE') {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'This assignment is not active',
        },
      };
    }

    const planDay = assignment.plan.days[0];
    if (!planDay) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `No workout scheduled for ${data.dayOfWeek}`,
        },
      };
    }

    if (planDay.isRestDay) {
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'This is a rest day' },
      };
    }

    // Calculate current week number
    const startDate = new Date(assignment.startDate);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const currentWeek =
      Math.floor((now.getTime() - startDate.getTime()) / msPerWeek) + 1;

    // Check if this day was already completed this week
    const existingCompletion = await this.db.workoutPlanCompletedDay.findFirst({
      where: {
        assignmentId: data.assignmentId,
        dayOfWeek: data.dayOfWeek,
        weekNumber: currentWeek,
      },
    });

    if (existingCompletion) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: `${data.dayOfWeek} was already completed this week`,
        },
      };
    }

    // Create the workout session with exercises pre-populated
    const workoutData = planDay.exercises.map((ex, index) => {
      // Create sets from plan sets, or default based on targetSets
      let setsToCreate: {
        setNumber: number;
        reps?: number;
        weight?: number;
        duration?: number;
      }[] = [];

      // Convert duration from minutes (plan storage) to seconds (workout storage)
      const durationInSeconds = ex.targetDuration
        ? ex.targetDuration * 60
        : undefined;

      if (ex.sets && ex.sets.length > 0) {
        // Use individual plan sets
        setsToCreate = ex.sets.map((s) => ({
          setNumber: s.setNumber,
          reps: s.targetReps ?? undefined,
          weight: s.targetWeight ?? undefined,
          duration: s.targetDuration ? s.targetDuration * 60 : undefined,
        }));
      } else if (ex.targetSets && ex.targetSets > 0) {
        // Create sets based on targetSets count
        const targetReps = ex.targetRepsMin ?? ex.targetRepsMax ?? undefined;
        const category = ex.exercise.category;
        const isCardio = category === 'CARDIO';

        // For cardio with duration, only create 1 set (duration is total, not per-set)
        const setCount = isCardio && durationInSeconds ? 1 : ex.targetSets;

        for (let i = 1; i <= setCount; i++) {
          setsToCreate.push({
            setNumber: i,
            reps: targetReps,
            weight: ex.targetWeight ?? undefined,
            duration: durationInSeconds,
          });
        }
      } else {
        // Smart default based on exercise category
        const category = ex.exercise.category;
        const isCardio = category === 'CARDIO';
        const defaultSetCount = isCardio ? 1 : 3;

        const targetReps = ex.targetRepsMin ?? ex.targetRepsMax ?? undefined;
        for (let i = 1; i <= defaultSetCount; i++) {
          setsToCreate.push({
            setNumber: i,
            reps: targetReps,
            weight: ex.targetWeight ?? undefined,
            duration: durationInSeconds,
          });
        }
      }

      return {
        exerciseId: ex.exerciseId,
        sortOrder: index,
        sets: {
          create: setsToCreate,
        },
      };
    });

    const session = await this.db.workoutSession.create({
      data: {
        userId,
        title: `${assignment.plan.name} - ${planDay.name || data.dayOfWeek}`,
        startedAt: new Date(),
        gymId: data.gymId ?? null,
        workouts: {
          create: workoutData,
        },
      },
      select: {
        id: true,
        workouts: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            exerciseId: true,
            exercise: {
              select: {
                name: true,
                category: true,
              },
            },
            sets: {
              orderBy: { setNumber: 'asc' },
              select: {
                id: true,
                setNumber: true,
              },
            },
          },
        },
      },
    });

    // Return session info with exercise details for the UI
    const exercises = session.workouts.map((w) => ({
      exerciseId: w.exerciseId,
      name: w.exercise.name,
      category: w.exercise.category,
      sets: w.sets.map((s) => s.setNumber),
    }));

    return {
      success: true,
      data: {
        sessionId: session.id,
        dayId: planDay.id,
        exercises,
      },
    };
  }

  /**
   * Complete a plan day - links a workout session to the assignment
   */
  async completePlanDay(
    userId: string,
    data: CompletePlanDay,
  ): Promise<SuccessResponse<{ completedDayId: string }> | ErrorResponse> {
    // Verify assignment access
    const assignment = await this.db.workoutPlanAssignment.findUnique({
      where: { id: data.assignmentId },
      select: {
        id: true,
        clientId: true,
        status: true,
        startDate: true,
      },
    });

    if (!assignment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found' },
      };
    }

    if (assignment.clientId !== userId) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'This is not your assignment' },
      };
    }

    // Verify session exists and belongs to user
    const session = await this.db.workoutSession.findUnique({
      where: { id: data.sessionId },
      select: { id: true, userId: true },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    if (session.userId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'This is not your workout session',
        },
      };
    }

    // Calculate current week number
    const startDate = new Date(assignment.startDate);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const currentWeek =
      Math.floor((now.getTime() - startDate.getTime()) / msPerWeek) + 1;

    // Check if already completed this week
    const existing = await this.db.workoutPlanCompletedDay.findFirst({
      where: {
        assignmentId: data.assignmentId,
        dayOfWeek: data.dayOfWeek,
        weekNumber: currentWeek,
      },
    });

    if (existing) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: `${data.dayOfWeek} was already marked complete this week`,
        },
      };
    }

    // Create the completed day record
    const completedDay = await this.db.workoutPlanCompletedDay.create({
      data: {
        assignmentId: data.assignmentId,
        dayOfWeek: data.dayOfWeek,
        weekNumber: currentWeek,
        sessionId: data.sessionId,
      },
    });

    return {
      success: true,
      data: { completedDayId: completedDay.id },
    };
  }

  /**
   * Get coach's workout plans
   */
  async getCoachPlans(
    coachUserId: string,
    query: WorkoutPlanQuery,
  ): Promise<SuccessResponse<WorkoutPlanListData> | ErrorResponse> {
    const { page = 1, limit = 12 } = query;

    // Get coach ID
    const coach = await this.db.coach.findUnique({
      where: { userId: coachUserId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach profile not found' },
      };
    }

    const where: Prisma.WorkoutPlanWhereInput = {
      creatorId: coachUserId,
      coachId: coach.id,
    };

    const [plans, total] = await Promise.all([
      this.db.workoutPlan.findMany({
        where,
        select: workoutPlanListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.workoutPlan.count({ where }),
    ]);

    const items: WorkoutPlanListItem[] = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      visibility: plan.visibility,
      durationWeeks: plan.durationWeeks,
      difficulty: plan.difficulty,
      copyCount: plan.copyCount,
      assignCount: plan.assignCount,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
      coachId: plan.coachId,
      creator: {
        id: plan.creator.id,
        displayName: plan.creator.profile?.displayName ?? null,
        avatarUrl: plan.creator.profile?.avatarUrl ?? null,
      },
      dayCount: plan.days.length,
    }));

    return {
      success: true,
      data: {
        plans: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a plan as a coach
   */
  async createCoachPlan(
    coachUserId: string,
    data: CreateWorkoutPlan,
  ): Promise<SuccessResponse<WorkoutPlanResponse> | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId: coachUserId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach profile not found' },
      };
    }

    return this.create(coachUserId, data, coach.id);
  }

  // ============================================
  // Helpers
  // ============================================

  private mapAssignment(a: any): WorkoutPlanAssignmentResponse {
    // Calculate current week number
    const startDate = new Date(a.startDate);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const currentWeek =
      Math.floor((now.getTime() - startDate.getTime()) / msPerWeek) + 1;

    return {
      id: a.id,
      planId: a.planId,
      plan: {
        id: a.plan.id,
        name: a.plan.name,
        description: a.plan.description,
        durationWeeks: a.plan.durationWeeks,
      },
      clientId: a.clientId,
      client: a.client
        ? {
            id: a.client.id,
            displayName: a.client.profile?.displayName ?? null,
            avatarUrl: a.client.profile?.avatarUrl ?? null,
          }
        : null,
      assignedById: a.assignedById,
      assignedBy: a.assignedBy
        ? {
            id: a.assignedBy.id,
            displayName: a.assignedBy.profile?.displayName ?? null,
            avatarUrl: a.assignedBy.profile?.avatarUrl ?? null,
          }
        : null,
      bookingId: a.bookingId,
      status: a.status,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate?.toISOString() ?? null,
      coachNotes: a.coachNotes,
      createdAt: a.createdAt.toISOString(),
      completedDaysCount: a.completedDays?.length ?? 0,
      currentWeek,
    };
  }
}

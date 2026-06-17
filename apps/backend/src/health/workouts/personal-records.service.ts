import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma';
import { DatabaseService } from '@app/database';
import type {
  CreatePersonalRecord,
  UpdatePersonalRecord,
  PersonalRecordQuery,
  PersonalRecordResponse,
  PersonalRecordListData,
  PRType,
  PRCheckResult,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';

const personalRecordSelect = {
  id: true,
  userId: true,
  exerciseId: true,
  exercise: {
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      difficulty: true,
    },
  },
  type: true,
  value: true,
  reps: true,
  weight: true,
  duration: true,
  distance: true,
  workoutSetId: true,
  achievedAt: true,
  created: true,
  updated: true,
} as const;

type PRWithSelect = Prisma.PersonalRecordGetPayload<{
  select: typeof personalRecordSelect;
}>;

@Injectable()
export class PersonalRecordsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get all personal records for a user
   */
  async findAll(
    userId: string,
    query: PersonalRecordQuery,
  ): Promise<SuccessResponse<PersonalRecordListData> | ErrorResponse> {
    const where: Prisma.PersonalRecordWhereInput = {
      userId,
      ...(query.exerciseId && { exerciseId: query.exerciseId }),
      ...(query.type && { type: query.type }),
    };

    const [items, total] = await Promise.all([
      this.db.personalRecord.findMany({
        where,
        select: personalRecordSelect,
        orderBy: [{ achievedAt: 'desc' }],
      }),
      this.db.personalRecord.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((pr) => this.mapToResponse(pr)),
        total,
      },
    };
  }

  /**
   * Get PRs for a specific exercise
   */
  async findByExercise(
    userId: string,
    exerciseId: string,
  ): Promise<SuccessResponse<PersonalRecordResponse[]> | ErrorResponse> {
    const prs = await this.db.personalRecord.findMany({
      where: { userId, exerciseId },
      select: personalRecordSelect,
      orderBy: [{ type: 'asc' }],
    });

    return {
      success: true,
      data: prs.map((pr) => this.mapToResponse(pr)),
    };
  }

  /**
   * Get a single PR by ID
   */
  async findOne(
    userId: string,
    prId: string,
  ): Promise<SuccessResponse<PersonalRecordResponse> | ErrorResponse> {
    const pr = await this.db.personalRecord.findUnique({
      where: { id: prId },
      select: personalRecordSelect,
    });

    if (!pr || pr.userId !== userId) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Personal record not found',
        },
      };
    }

    return {
      success: true,
      data: this.mapToResponse(pr),
    };
  }

  /**
   * Create or update a personal record (manual entry)
   */
  async create(
    userId: string,
    data: CreatePersonalRecord,
  ): Promise<SuccessResponse<PersonalRecordResponse> | ErrorResponse> {
    // Verify exercise exists
    const exercise = await this.db.exercise.findUnique({
      where: { id: data.exerciseId },
    });

    if (!exercise) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Exercise not found',
        },
      };
    }

    // Upsert - only one PR per type per exercise per user
    const pr = await this.db.personalRecord.upsert({
      where: {
        userId_exerciseId_type: {
          userId,
          exerciseId: data.exerciseId,
          type: data.type,
        },
      },
      create: {
        userId,
        exerciseId: data.exerciseId,
        type: data.type,
        value: data.value,
        reps: data.reps,
        weight: data.weight,
        duration: data.duration,
        distance: data.distance,
        achievedAt: data.achievedAt ? new Date(data.achievedAt) : new Date(),
      },
      update: {
        value: data.value,
        reps: data.reps,
        weight: data.weight,
        duration: data.duration,
        distance: data.distance,
        achievedAt: data.achievedAt ? new Date(data.achievedAt) : new Date(),
      },
      select: personalRecordSelect,
    });

    return {
      success: true,
      data: this.mapToResponse(pr),
    };
  }

  /**
   * Update a personal record
   */
  async update(
    userId: string,
    prId: string,
    data: UpdatePersonalRecord,
  ): Promise<SuccessResponse<PersonalRecordResponse> | ErrorResponse> {
    const existing = await this.db.personalRecord.findUnique({
      where: { id: prId },
    });

    if (!existing || existing.userId !== userId) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Personal record not found',
        },
      };
    }

    const pr = await this.db.personalRecord.update({
      where: { id: prId },
      data: {
        ...(data.value !== undefined && { value: data.value }),
        ...(data.reps !== undefined && { reps: data.reps }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.distance !== undefined && { distance: data.distance }),
        ...(data.achievedAt && { achievedAt: new Date(data.achievedAt) }),
      },
      select: personalRecordSelect,
    });

    return {
      success: true,
      data: this.mapToResponse(pr),
    };
  }

  /**
   * Delete a personal record
   */
  async delete(
    userId: string,
    prId: string,
  ): Promise<SuccessResponse<{ deleted: boolean }> | ErrorResponse> {
    const existing = await this.db.personalRecord.findUnique({
      where: { id: prId },
    });

    if (!existing || existing.userId !== userId) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Personal record not found',
        },
      };
    }

    await this.db.personalRecord.delete({ where: { id: prId } });

    return {
      success: true,
      data: { deleted: true },
    };
  }

  /**
   * Check if a set achieves a new PR and update if so
   * Called automatically when logging workout sets
   */
  async checkAndUpdatePR(
    userId: string,
    exerciseId: string,
    exerciseCategory: string,
    setData: {
      reps?: number;
      weight?: number;
      duration?: number;
      distance?: number;
    },
    workoutSetId: string,
  ): Promise<PRCheckResult[]> {
    const results: PRCheckResult[] = [];

    // Determine which PR types to check based on exercise category
    if (exerciseCategory === 'STRENGTH') {
      // Check MAX_WEIGHT
      if (setData.weight && setData.reps) {
        const maxWeightResult = await this.checkPRType(
          userId,
          exerciseId,
          'MAX_WEIGHT',
          setData.weight,
          workoutSetId,
          { reps: setData.reps },
        );
        results.push(maxWeightResult);

        // Check MAX_VOLUME (weight × reps)
        const volume = setData.weight * setData.reps;
        const maxVolumeResult = await this.checkPRType(
          userId,
          exerciseId,
          'MAX_VOLUME',
          volume,
          workoutSetId,
          { reps: setData.reps, weight: setData.weight },
        );
        results.push(maxVolumeResult);
      }

      // Check MAX_REPS at a given weight
      if (setData.reps && setData.weight) {
        const maxRepsResult = await this.checkPRType(
          userId,
          exerciseId,
          'MAX_REPS',
          setData.reps,
          workoutSetId,
          { weight: setData.weight },
        );
        results.push(maxRepsResult);
      }
    } else if (exerciseCategory === 'CARDIO') {
      // Check LONGEST_DIST
      if (setData.distance) {
        const longestDistResult = await this.checkPRType(
          userId,
          exerciseId,
          'LONGEST_DIST',
          setData.distance,
          workoutSetId,
          { duration: setData.duration },
        );
        results.push(longestDistResult);
      }

      // Check LONGEST_TIME
      if (setData.duration) {
        const longestTimeResult = await this.checkPRType(
          userId,
          exerciseId,
          'LONGEST_TIME',
          setData.duration,
          workoutSetId,
          { distance: setData.distance },
        );
        results.push(longestTimeResult);
      }

      // Check BEST_PACE (distance/duration - higher is better)
      if (setData.distance && setData.duration && setData.duration > 0) {
        const pace = setData.distance / setData.duration; // meters per second
        const bestPaceResult = await this.checkPRType(
          userId,
          exerciseId,
          'BEST_PACE',
          pace,
          workoutSetId,
          { distance: setData.distance, duration: setData.duration },
        );
        results.push(bestPaceResult);
      }
    } else {
      // BODYWEIGHT, FLEXIBILITY, PLYOMETRICS
      // Check MAX_REPS
      if (setData.reps) {
        const maxRepsResult = await this.checkPRType(
          userId,
          exerciseId,
          'MAX_REPS',
          setData.reps,
          workoutSetId,
          { duration: setData.duration },
        );
        results.push(maxRepsResult);
      }

      // Check LONGEST_TIME (for holds)
      if (setData.duration) {
        const longestTimeResult = await this.checkPRType(
          userId,
          exerciseId,
          'LONGEST_TIME',
          setData.duration,
          workoutSetId,
          { reps: setData.reps },
        );
        results.push(longestTimeResult);
      }
    }

    return results.filter((r) => r.isNewPR);
  }

  /**
   * Check a specific PR type and update if new record
   */
  private async checkPRType(
    userId: string,
    exerciseId: string,
    type: PRType,
    value: number,
    workoutSetId: string,
    context: {
      reps?: number;
      weight?: number;
      duration?: number;
      distance?: number;
    },
  ): Promise<PRCheckResult> {
    const existing = await this.db.personalRecord.findUnique({
      where: {
        userId_exerciseId_type: {
          userId,
          exerciseId,
          type,
        },
      },
    });

    // Higher is always better for our PR types
    if (!existing || value > existing.value) {
      await this.db.personalRecord.upsert({
        where: {
          userId_exerciseId_type: {
            userId,
            exerciseId,
            type,
          },
        },
        create: {
          userId,
          exerciseId,
          type,
          value,
          reps: context.reps,
          weight: context.weight,
          duration: context.duration,
          distance: context.distance,
          workoutSetId,
          achievedAt: new Date(),
        },
        update: {
          value,
          reps: context.reps,
          weight: context.weight,
          duration: context.duration,
          distance: context.distance,
          workoutSetId,
          achievedAt: new Date(),
        },
      });

      return {
        isNewPR: true,
        type,
        previousValue: existing?.value,
        newValue: value,
        improvement: existing
          ? ((value - existing.value) / existing.value) * 100
          : undefined,
      };
    }

    return { isNewPR: false };
  }

  /**
   * Map database record to response
   */
  private mapToResponse(pr: PRWithSelect): PersonalRecordResponse {
    return {
      id: pr.id,
      userId: pr.userId,
      exerciseId: pr.exerciseId,
      exercise: {
        id: pr.exercise.id,
        slug: pr.exercise.slug,
        name: pr.exercise.name,
        category: pr.exercise.category,
        difficulty: pr.exercise.difficulty,
      },
      type: pr.type,
      value: pr.value,
      reps: pr.reps,
      weight: pr.weight,
      duration: pr.duration,
      distance: pr.distance,
      workoutSetId: pr.workoutSetId,
      achievedAt: pr.achievedAt.toISOString(),
      created: pr.created.toISOString(),
      updated: pr.updated.toISOString(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  type WorkoutGoalResponse,
  type UpsertWorkoutGoal,
  type MuscleTargets,
  type SuccessResponse,
} from '@varaperformance/core';

// Default muscle targets (sets per week)
const DEFAULT_MUSCLE_TARGETS: MuscleTargets = {
  CHEST: 16,
  BACK: 18,
  SHOULDERS: 14,
  ARMS: 12,
  LEGS: 16,
  CORE: 10,
};

@Injectable()
export class WorkoutGoalService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get workout goal for user
   */
  async getGoal(
    userId: string,
  ): Promise<SuccessResponse<WorkoutGoalResponse | null>> {
    const goal = await this.db.workoutGoal.findUnique({
      where: { userId },
    });

    if (!goal) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: this.formatGoalResponse(goal),
    };
  }

  /**
   * Get workout goal or return defaults
   */
  async getGoalOrDefaults(
    userId: string,
  ): Promise<SuccessResponse<WorkoutGoalResponse>> {
    const goal = await this.db.workoutGoal.findUnique({
      where: { userId },
    });

    if (!goal) {
      // Return default values
      return {
        success: true,
        data: {
          id: '',
          weeklyWorkouts: 4,
          muscleTargets: DEFAULT_MUSCLE_TARGETS,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      data: this.formatGoalResponse(goal),
    };
  }

  /**
   * Create or update workout goal
   */
  async upsertGoal(
    userId: string,
    data: UpsertWorkoutGoal,
  ): Promise<SuccessResponse<WorkoutGoalResponse>> {
    const goal = await this.db.workoutGoal.upsert({
      where: { userId },
      create: {
        userId,
        weeklyWorkouts: data.weeklyWorkouts ?? 4,
        muscleTargets: data.muscleTargets ?? DEFAULT_MUSCLE_TARGETS,
      },
      update: {
        ...(data.weeklyWorkouts !== undefined && {
          weeklyWorkouts: data.weeklyWorkouts,
        }),
        ...(data.muscleTargets !== undefined && {
          muscleTargets: data.muscleTargets,
        }),
      },
    });

    return {
      success: true,
      data: this.formatGoalResponse(goal),
    };
  }

  /**
   * Delete workout goal
   */
  async deleteGoal(userId: string): Promise<SuccessResponse<void>> {
    await this.db.workoutGoal.delete({
      where: { userId },
    });

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Format goal for response
   */
  private formatGoalResponse(goal: {
    id: string;
    weeklyWorkouts: number;
    muscleTargets: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): WorkoutGoalResponse {
    return {
      id: goal.id,
      weeklyWorkouts: goal.weeklyWorkouts,
      muscleTargets:
        (goal.muscleTargets as MuscleTargets) ?? DEFAULT_MUSCLE_TARGETS,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}

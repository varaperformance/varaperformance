import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  LifestyleInsightsResponse,
  SuccessResponse,
  UpdateLifestyleGoal,
} from '@varaperformance/core';

type LifestyleGoalPayload = {
  id: string;
  sleepHours: number;
  dailySteps: number;
  adherenceTarget: number;
  checkInsPerWeek: number;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_LIFESTYLE_GOAL = {
  sleepHours: 8,
  dailySteps: 10000,
  adherenceTarget: 85,
  checkInsPerWeek: 4,
};

const DEFAULT_WORKOUTS_PER_WEEK = 4;
const INSIGHT_WINDOW_DAYS = 14;

@Injectable()
export class LifestyleService {
  constructor(private readonly db: DatabaseService) {}

  async getInsights(
    userId: string,
  ): Promise<SuccessResponse<LifestyleInsightsResponse>> {
    const today = this.startOfUtcDay(new Date());
    const windowStart = new Date(today);
    windowStart.setUTCDate(
      windowStart.getUTCDate() - (INSIGHT_WINDOW_DAYS - 1),
    );

    const [
      lifestyleGoal,
      workoutGoal,
      sessions,
      foodLogs,
      waterLogs,
      stepLogs,
      sleepLogs,
    ] = await Promise.all([
      this.db.lifestyleGoal.findUnique({
        where: { userId },
        select: {
          adherenceTarget: true,
          checkInsPerWeek: true,
          dailySteps: true,
          sleepHours: true,
        },
      }),
      this.db.workoutGoal.findUnique({
        where: { userId },
        select: { weeklyWorkouts: true },
      }),
      this.db.workoutSession.findMany({
        where: {
          userId,
          performed: { gte: windowStart },
        },
        select: { performed: true },
      }),
      this.db.foodLog.findMany({
        where: {
          userId,
          loggedAt: { gte: windowStart },
        },
        select: { loggedAt: true },
      }),
      this.db.waterLog.findMany({
        where: {
          userId,
          loggedAt: { gte: windowStart },
        },
        select: { loggedAt: true },
      }),
      this.db.stepLog.findMany({
        where: {
          userId,
          date: { gte: windowStart },
        },
        select: { date: true, steps: true },
      }),
      this.db.sleepLog.findMany({
        where: {
          userId,
          date: { gte: windowStart },
        },
        select: { date: true, duration: true },
      }),
    ]);

    const workoutTarget =
      workoutGoal?.weeklyWorkouts ?? DEFAULT_WORKOUTS_PER_WEEK;
    const adherenceTarget =
      lifestyleGoal?.adherenceTarget ?? DEFAULT_LIFESTYLE_GOAL.adherenceTarget;
    const checkInTarget =
      lifestyleGoal?.checkInsPerWeek ?? DEFAULT_LIFESTYLE_GOAL.checkInsPerWeek;
    const stepsTarget =
      lifestyleGoal?.dailySteps ?? DEFAULT_LIFESTYLE_GOAL.dailySteps;
    const sleepTarget =
      lifestyleGoal?.sleepHours ?? DEFAULT_LIFESTYLE_GOAL.sleepHours;

    const workoutsByDay = new Map<string, number>();
    const nutritionDays = new Set<string>();
    const hydrationDays = new Set<string>();
    const stepsByDay = new Map<string, number>();
    const sleepByDay = new Map<string, number>();

    for (const session of sessions) {
      const dayKey = this.formatDateKeyUtc(session.performed);
      workoutsByDay.set(dayKey, (workoutsByDay.get(dayKey) ?? 0) + 1);
    }

    for (const log of foodLogs) {
      nutritionDays.add(this.formatDateKeyUtc(log.loggedAt));
    }

    for (const log of waterLogs) {
      hydrationDays.add(this.formatDateKeyUtc(log.loggedAt));
    }

    for (const log of stepLogs) {
      const dayKey = this.formatDateKeyUtc(log.date);
      stepsByDay.set(dayKey, (stepsByDay.get(dayKey) ?? 0) + log.steps);
    }

    for (const log of sleepLogs) {
      const dayKey = this.formatDateKeyUtc(log.date);
      // Take the max sleep duration for a day (in case of multiple sources)
      const existing = sleepByDay.get(dayKey) ?? 0;
      if (log.duration > existing) {
        sleepByDay.set(dayKey, log.duration);
      }
    }

    const trend = Array.from({ length: INSIGHT_WINDOW_DAYS }, (_, index) => {
      const date = new Date(windowStart);
      date.setUTCDate(windowStart.getUTCDate() + index);
      const dateKey = this.formatDateKeyUtc(date);
      const workoutCount = workoutsByDay.get(dateKey) ?? 0;
      const nutritionLogged = nutritionDays.has(dateKey);
      const hydrationLogged = hydrationDays.has(dateKey);
      const stepCount = stepsByDay.get(dateKey) ?? 0;
      const sleepHours = sleepByDay.get(dateKey) ?? 0;

      return {
        date: dateKey,
        workoutCount,
        nutritionLogged,
        hydrationLogged,
        stepCount,
        sleepHours,
        adherenceScore: this.calculateDailyAdherenceScore(
          workoutCount,
          nutritionLogged,
          hydrationLogged,
          stepCount >= stepsTarget,
        ),
        recoveryScore: this.calculateDailyRecoveryScore(
          workoutCount,
          nutritionLogged,
          hydrationLogged,
          sleepHours,
          sleepTarget,
        ),
      };
    });

    const previousTrend = trend.slice(0, 7);
    const currentTrend = trend.slice(7);

    const previousWeek = this.createWeekSummary(
      previousTrend,
      workoutTarget,
      checkInTarget,
      stepsTarget,
    );
    const currentWeek = this.createWeekSummary(
      currentTrend,
      workoutTarget,
      checkInTarget,
      stepsTarget,
    );

    const previousAdherence = this.calculateWeeklyAdherenceScore(
      previousWeek,
      workoutTarget,
      checkInTarget,
    );
    const currentAdherence = this.calculateWeeklyAdherenceScore(
      currentWeek,
      workoutTarget,
      checkInTarget,
    );

    const previousRecovery = this.average(
      previousTrend.map((point) => point.recoveryScore),
    );
    const currentRecovery = this.average(
      currentTrend.map((point) => point.recoveryScore),
    );

    const adherenceDelta = currentAdherence - previousAdherence;
    const recoveryDelta = currentRecovery - previousRecovery;

    return {
      success: true,
      data: {
        adherenceScore: currentAdherence,
        adherenceTarget,
        adherenceTrend: this.resolveTrendDirection(adherenceDelta),
        adherenceDelta,
        recoveryScore: currentRecovery,
        recoveryTrend: this.resolveTrendDirection(recoveryDelta),
        recoveryDelta,
        currentWeek,
        previousWeek,
        trend,
      },
    };
  }

  async getGoal(
    userId: string,
  ): Promise<SuccessResponse<LifestyleGoalPayload | null>> {
    const goal = await this.db.lifestyleGoal.findUnique({
      where: { userId },
    });

    if (!goal) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: this.formatGoalResponse(goal),
    };
  }

  async getGoalOrDefaults(
    userId: string,
  ): Promise<SuccessResponse<LifestyleGoalPayload>> {
    const goal = await this.db.lifestyleGoal.findUnique({
      where: { userId },
    });

    if (!goal) {
      return {
        success: true,
        data: {
          id: '',
          ...DEFAULT_LIFESTYLE_GOAL,
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

  async upsertGoal(
    userId: string,
    data: UpdateLifestyleGoal,
  ): Promise<SuccessResponse<LifestyleGoalPayload>> {
    const goal = await this.db.lifestyleGoal.upsert({
      where: { userId },
      create: {
        userId,
        sleepHours: data.sleepHours ?? DEFAULT_LIFESTYLE_GOAL.sleepHours,
        dailySteps: data.dailySteps ?? DEFAULT_LIFESTYLE_GOAL.dailySteps,
        adherenceTarget:
          data.adherenceTarget ?? DEFAULT_LIFESTYLE_GOAL.adherenceTarget,
        checkInsPerWeek:
          data.checkInsPerWeek ?? DEFAULT_LIFESTYLE_GOAL.checkInsPerWeek,
      },
      update: {
        ...(data.sleepHours !== undefined && { sleepHours: data.sleepHours }),
        ...(data.dailySteps !== undefined && { dailySteps: data.dailySteps }),
        ...(data.adherenceTarget !== undefined && {
          adherenceTarget: data.adherenceTarget,
        }),
        ...(data.checkInsPerWeek !== undefined && {
          checkInsPerWeek: data.checkInsPerWeek,
        }),
      },
    });

    return {
      success: true,
      data: this.formatGoalResponse(goal),
    };
  }

  private formatGoalResponse(goal: {
    id: string;
    sleepHours: number;
    dailySteps: number;
    adherenceTarget: number;
    checkInsPerWeek: number;
    createdAt: Date;
    updatedAt: Date;
  }): LifestyleGoalPayload {
    return {
      id: goal.id,
      sleepHours: goal.sleepHours,
      dailySteps: goal.dailySteps,
      adherenceTarget: goal.adherenceTarget,
      checkInsPerWeek: goal.checkInsPerWeek,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  private createWeekSummary(
    trend: Array<{
      workoutCount: number;
      nutritionLogged: boolean;
      hydrationLogged: boolean;
      stepCount: number;
    }>,
    workoutTarget: number,
    checkInTarget: number,
    stepsTarget: number,
  ) {
    const workoutDays = trend.filter((point) => point.workoutCount > 0).length;
    const nutritionDays = trend.filter((point) => point.nutritionLogged).length;
    const hydrationDays = trend.filter((point) => point.hydrationLogged).length;
    const stepsDays = trend.filter(
      (point) => point.stepCount >= stepsTarget,
    ).length;

    return {
      workoutDays,
      workoutTarget,
      nutritionDays,
      hydrationDays,
      stepsDays,
      stepsTarget: 7,
      checkInDays: workoutDays,
      checkInTarget,
    };
  }

  private calculateWeeklyAdherenceScore(
    week: {
      workoutDays: number;
      nutritionDays: number;
      hydrationDays: number;
      checkInDays: number;
    },
    workoutTarget: number,
    checkInTarget: number,
  ): number {
    const workoutScore = this.toPercent(week.workoutDays, workoutTarget);
    const nutritionScore = this.toPercent(week.nutritionDays, 7);
    const hydrationScore = this.toPercent(week.hydrationDays, 7);
    const checkInScore = this.toPercent(week.checkInDays, checkInTarget);

    const weighted =
      workoutScore * 0.4 +
      nutritionScore * 0.2 +
      hydrationScore * 0.2 +
      checkInScore * 0.2;

    return this.clamp(Math.round(weighted), 0, 100);
  }

  private calculateDailyAdherenceScore(
    workoutCount: number,
    nutritionLogged: boolean,
    hydrationLogged: boolean,
    stepsGoalMet: boolean,
  ): number {
    const workoutPoints = workoutCount > 0 ? 30 : 0;
    const nutritionPoints = nutritionLogged ? 25 : 0;
    const hydrationPoints = hydrationLogged ? 25 : 0;
    const stepsPoints = stepsGoalMet ? 20 : 0;
    return this.clamp(
      workoutPoints + nutritionPoints + hydrationPoints + stepsPoints,
      0,
      100,
    );
  }

  private calculateDailyRecoveryScore(
    workoutCount: number,
    nutritionLogged: boolean,
    hydrationLogged: boolean,
    sleepHours: number,
    sleepTarget: number,
  ): number {
    let score = 40;

    if (nutritionLogged) score += 15;
    if (hydrationLogged) score += 15;

    // Sleep contribution (up to 20 points)
    if (sleepHours > 0) {
      const sleepRatio = Math.min(sleepHours / sleepTarget, 1.2);
      score += Math.round(sleepRatio * 20);
    }

    if (workoutCount === 0) score += 10;
    else if (workoutCount === 1) score += 5;
    else score -= 10;

    return this.clamp(score, 0, 100);
  }

  private resolveTrendDirection(delta: number): 'up' | 'down' | 'neutral' {
    if (delta >= 3) return 'up';
    if (delta <= -3) return 'down';
    return 'neutral';
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private formatDateKeyUtc(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round((total / values.length) * 10) / 10;
  }

  private toPercent(value: number, target: number): number {
    if (target <= 0) return 0;
    return this.clamp(Math.round((value / target) * 100), 0, 100);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

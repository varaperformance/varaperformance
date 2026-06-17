import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  CreateWaterLog,
  UpdateWaterGoal,
  WaterLogQuery,
  WaterLogResponse,
  WaterGoalResponse,
  DailyWaterSummary,
  VolumeUnit,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';
import {
  getEffectiveTimezone,
  getTodayInTimezone,
} from '@varaperformance/core';

// Conversion factors to oz
const OZ_CONVERSIONS: Record<VolumeUnit, number> = {
  OZ: 1,
  ML: 0.033814, // 1 ml = 0.033814 oz
  L: 33.814, // 1 L = 33.814 oz
  CUPS: 8, // 1 cup = 8 oz
};

@Injectable()
export class WaterService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Log water intake
   */
  async logWater(
    userId: string,
    data: CreateWaterLog,
  ): Promise<SuccessResponse<WaterLogResponse>> {
    const log = await this.db.waterLog.create({
      data: {
        userId,
        amount: data.amount,
        unit: data.unit,
      },
    });

    return { success: true, data: this.formatLogResponse(log) };
  }

  /**
   * Get daily water summary (logs + goal + progress)
   */
  async getDailySummary(
    userId: string,
    query: WaterLogQuery,
  ): Promise<SuccessResponse<DailyWaterSummary>> {
    let date = query.date;
    if (!date) {
      const profile = await this.db.profile.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      date = getTodayInTimezone(getEffectiveTimezone(profile?.timezone));
    }

    // Parse date parts to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const [logs, goal] = await Promise.all([
      this.db.waterLog.findMany({
        where: {
          userId,
          loggedAt: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { loggedAt: 'desc' },
      }),
      this.db.waterGoal.findUnique({ where: { userId } }),
    ]);

    // Calculate total in oz
    const totalOz = logs.reduce((sum, log) => {
      return sum + log.amount * OZ_CONVERSIONS[log.unit as VolumeUnit];
    }, 0);

    // Calculate progress percentage
    const goalOz = goal
      ? goal.targetAmount * OZ_CONVERSIONS[goal.targetUnit as VolumeUnit]
      : 64; // Default 64oz
    const progress = Math.round((totalOz / goalOz) * 100);

    return {
      success: true,
      data: {
        date,
        logs: logs.map((l) => this.formatLogResponse(l)),
        totalOz: Math.round(totalOz * 10) / 10,
        goal: goal ? this.formatGoalResponse(goal) : null,
        progress,
      },
    };
  }

  /**
   * Get or create water goal for user
   */
  async getGoal(userId: string): Promise<SuccessResponse<WaterGoalResponse>> {
    let goal = await this.db.waterGoal.findUnique({ where: { userId } });

    if (!goal) {
      // Create default goal
      goal = await this.db.waterGoal.create({
        data: {
          userId,
          targetAmount: 64,
          targetUnit: 'OZ',
        },
      });
    }

    return { success: true, data: this.formatGoalResponse(goal) };
  }

  /**
   * Update water goal
   */
  async updateGoal(
    userId: string,
    data: UpdateWaterGoal,
  ): Promise<SuccessResponse<WaterGoalResponse>> {
    const goal = await this.db.waterGoal.upsert({
      where: { userId },
      create: {
        userId,
        targetAmount: data.targetAmount ?? 64,
        targetUnit: data.targetUnit ?? 'OZ',
      },
      update: {
        ...(data.targetAmount !== undefined && {
          targetAmount: data.targetAmount,
        }),
        ...(data.targetUnit !== undefined && { targetUnit: data.targetUnit }),
      },
    });

    return { success: true, data: this.formatGoalResponse(goal) };
  }

  /**
   * Delete a water log
   */
  async removeLog(
    userId: string,
    logId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const log = await this.db.waterLog.findFirst({
      where: { id: logId, userId },
      select: { id: true },
    });

    if (!log) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Water log not found' },
      };
    }

    await this.db.waterLog.delete({ where: { id: logId } });

    return { success: true, data: { deleted: true } };
  }

  /**
   * Get daily water totals over a date range (for trend charts).
   */
  async getHistory(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<
    SuccessResponse<{
      days: Array<{ date: string; totalOz: number; goalOz: number }>;
    }>
  > {
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const [logs, goal] = await Promise.all([
      this.db.waterLog.findMany({
        where: { userId, loggedAt: { gte: start, lte: end } },
        select: { amount: true, unit: true, loggedAt: true },
        orderBy: { loggedAt: 'asc' },
      }),
      this.db.waterGoal.findUnique({ where: { userId } }),
    ]);

    const goalOz = goal
      ? goal.targetAmount * OZ_CONVERSIONS[goal.targetUnit as VolumeUnit]
      : 64;

    // Bucket by date
    const buckets: Record<string, number> = {};
    const cursor = new Date(start);
    while (cursor <= end) {
      buckets[this.formatDate(cursor)] = 0;
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const log of logs) {
      const key = this.formatDate(log.loggedAt);
      if (buckets[key] !== undefined) {
        buckets[key] += log.amount * OZ_CONVERSIONS[log.unit as VolumeUnit];
      }
    }

    const days = Object.entries(buckets).map(([date, totalOz]) => ({
      date,
      totalOz: Math.round(totalOz * 10) / 10,
      goalOz: Math.round(goalOz * 10) / 10,
    }));

    return { success: true, data: { days } };
  }

  /**
   * Format water log for response
   */
  private formatLogResponse(log: {
    id: string;
    amount: number;
    unit: string;
    loggedAt: Date;
  }): WaterLogResponse {
    return {
      id: log.id,
      amount: log.amount,
      unit: log.unit as VolumeUnit,
      loggedAt: log.loggedAt.toISOString(),
    };
  }

  /**
   * Format water goal for response
   */
  private formatGoalResponse(goal: {
    id: string;
    targetAmount: number;
    targetUnit: string;
  }): WaterGoalResponse {
    return {
      id: goal.id,
      targetAmount: goal.targetAmount,
      targetUnit: goal.targetUnit as VolumeUnit,
    };
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

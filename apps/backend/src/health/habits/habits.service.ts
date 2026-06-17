import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type { SuccessResponse } from '@varaperformance/core';
import { habitSelect, habitLogSelect } from './selectors/habit.selector';
import {
  getEffectiveTimezone,
  getTodayInTimezone,
  getDaysAgoInTimezone,
} from '@varaperformance/core';
import { AchievementsService } from '../../achievements/achievements.service';

@Injectable()
export class HabitsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * List all habits for a user.
   */
  async findAll(
    userId: string,
    includeInactive = false,
  ): Promise<SuccessResponse<{ items: unknown[] }>> {
    const habits = await this.db.habit.findMany({
      where: {
        userId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: habitSelect,
      orderBy: { sortOrder: 'asc' },
    });

    return { success: true, data: { items: habits } };
  }

  /**
   * Create a new habit.
   */
  async create(
    userId: string,
    data: {
      name: string;
      icon?: string;
      color?: string;
      linkedModule?: string | null;
    },
  ): Promise<SuccessResponse<{ id: string }>> {
    // Get next sort order
    const count = await this.db.habit.count({ where: { userId } });

    const habit = await this.db.habit.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon ?? 'circle-check',
        color: data.color ?? '#6366f1',
        linkedModule: (data.linkedModule as any) ?? null,
        sortOrder: count,
      },
      select: { id: true },
    });

    return { success: true, data: { id: habit.id } };
  }

  /**
   * Update a habit.
   */
  async update(
    userId: string,
    habitId: string,
    data: {
      name?: string;
      icon?: string;
      color?: string;
      isActive?: boolean;
      sortOrder?: number;
      linkedModule?: string | null;
    },
  ): Promise<SuccessResponse<{ id: string }>> {
    const habit = await this.db.habit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit) throw new NotFoundException('Habit not found');

    await this.db.habit.update({
      where: { id: habitId },
      data: {
        ...data,
        linkedModule: data.linkedModule as any,
      },
    });

    return { success: true, data: { id: habitId } };
  }

  /**
   * Delete a habit.
   */
  async remove(
    userId: string,
    habitId: string,
  ): Promise<SuccessResponse<{ message: string }>> {
    const habit = await this.db.habit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit) throw new NotFoundException('Habit not found');

    await this.db.habit.delete({ where: { id: habitId } });

    return { success: true, data: { message: 'Habit deleted' } };
  }

  /**
   * Toggle a habit completion for a date.
   * If already logged, removes the log. Otherwise, creates it.
   * Updates streak counters.
   */
  async toggleLog(
    userId: string,
    habitId: string,
    dateStr?: string,
  ): Promise<SuccessResponse<{ completed: boolean }>> {
    const habit = await this.db.habit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit) throw new NotFoundException('Habit not found');

    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const tz = getEffectiveTimezone(profile?.timezone);
    const dateKey = dateStr ?? getTodayInTimezone(tz);
    const date = new Date(dateKey + 'T00:00:00.000Z');

    const existing = await this.db.habitLog.findUnique({
      where: { habitId_date: { habitId, date } },
    });

    if (existing) {
      // Un-complete: remove the log
      await this.db.habitLog.delete({ where: { id: existing.id } });
      await this.recalculateStreak(habitId, userId);
      return { success: true, data: { completed: false } };
    }

    // Complete: create the log
    await this.db.habitLog.create({
      data: { habitId, date, completed: true },
    });
    await this.recalculateStreak(habitId, userId);

    return { success: true, data: { completed: true } };
  }

  /**
   * Get habit log heatmap data for a date range.
   */
  async getHeatmap(
    userId: string,
    from: string,
    to: string,
  ): Promise<SuccessResponse<{ items: { date: string; count: number }[] }>> {
    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T23:59:59.999Z');

    const logs = await this.db.habitLog.findMany({
      where: {
        habit: { userId },
        date: { gte: fromDate, lte: toDate },
        completed: true,
      },
      select: { date: true },
    });

    // Group by date
    const countsByDate = new Map<string, number>();
    for (const log of logs) {
      const key = log.date.toISOString().split('T')[0];
      countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
    }

    const items = Array.from(countsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: { items } };
  }

  /**
   * Get logs for a specific habit in a date range.
   */
  async getHabitLogs(
    userId: string,
    habitId: string,
    from: string,
    to: string,
  ): Promise<SuccessResponse<{ items: unknown[] }>> {
    const habit = await this.db.habit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit) throw new NotFoundException('Habit not found');

    const logs = await this.db.habitLog.findMany({
      where: {
        habitId,
        date: {
          gte: new Date(from + 'T00:00:00.000Z'),
          lte: new Date(to + 'T23:59:59.999Z'),
        },
      },
      select: habitLogSelect,
      orderBy: { date: 'desc' },
    });

    return { success: true, data: { items: logs } };
  }

  /**
   * Recalculate streak for a habit based on logs.
   */
  private async recalculateStreak(
    habitId: string,
    userId?: string,
  ): Promise<void> {
    const logs = await this.db.habitLog.findMany({
      where: { habitId, completed: true },
      select: { date: true },
      orderBy: { date: 'desc' },
    });

    if (logs.length === 0) {
      await this.db.habit.update({
        where: { id: habitId },
        data: { currentStreak: 0, longestStreak: 0, lastCompletedDate: null },
      });
      return;
    }

    // Look up user's timezone for accurate "today"/"yesterday" calculation
    let tz = 'UTC';
    if (userId) {
      const profile = await this.db.profile.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      tz = getEffectiveTimezone(profile?.timezone);
    }

    const dates = logs.map((l) => l.date.toISOString().split('T')[0]);
    const lastDate = dates[0];

    // Calculate current streak (consecutive days ending today or yesterday)
    const todayKey = getTodayInTimezone(tz);
    const yesterdayKey = getDaysAgoInTimezone(1, tz);

    let currentStreak = 0;
    if (lastDate === todayKey || lastDate === yesterdayKey) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;
    const sortedDates = [...dates].sort();
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    if (dates.length === 1) longestStreak = 1;

    await this.db.habit.update({
      where: { id: habitId },
      data: {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        lastCompletedDate: new Date(lastDate + 'T00:00:00.000Z'),
      },
    });

    // Check STREAK achievements (e.g. Week Warrior, Monthly Master)
    if (userId && currentStreak > 0) {
      this.achievementsService
        .checkAndAward(userId, 'STREAK', currentStreak)
        .catch(() => {});
    }
  }

  /**
   * Auto-complete habits linked to a health module (STACK, CLIMB, INJECTION).
   * Called by stacks/climb/injection services after user logs activity.
   */
  async autoCompleteLinkedHabits(
    userId: string,
    module: 'STACK' | 'CLIMB' | 'INJECTION',
    dateStr?: string,
  ): Promise<void> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const tz = getEffectiveTimezone(profile?.timezone);
    const dateKey = dateStr ?? getTodayInTimezone(tz);
    const date = new Date(dateKey + 'T00:00:00.000Z');

    const linkedHabits = await this.db.habit.findMany({
      where: { userId, isActive: true, linkedModule: module },
      select: { id: true },
    });

    for (const habit of linkedHabits) {
      await this.db.habitLog.upsert({
        where: { habitId_date: { habitId: habit.id, date } },
        create: { habitId: habit.id, date, completed: true },
        update: { completed: true },
      });
      await this.recalculateStreak(habit.id, userId);
    }
  }
}

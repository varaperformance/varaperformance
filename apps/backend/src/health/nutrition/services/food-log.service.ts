import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { AchievementsService } from '../../../achievements/achievements.service';
import {
  foodLogSelect,
  nutritionGoalSelect,
  favoriteFoodSelect,
  foodListSelect,
} from '../selectors/nutrition.selector';
import type {
  CreateFoodLog,
  UpdateFoodLog,
  FoodLogQuery,
  UpdateNutritionGoal,
  AddFavoriteFood,
  MealType,
} from '@varaperformance/core';
import {
  getEffectiveTimezone,
  getTodayInTimezone,
} from '@varaperformance/core';
import type {
  FoodLogResponse,
  DailyNutritionSummary,
  MealSummary,
  NutritionGoalResponse,
  FavoriteFoodResponse,
  RecentFoodResponse,
  SuccessResponse,
} from '@varaperformance/core';

@Injectable()
export class FoodLogService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * Log food entry
   */
  async logFood(
    userId: string,
    data: CreateFoodLog,
  ): Promise<SuccessResponse<FoodLogResponse>> {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Calculate totals based on food or quick add
    if (data.foodId) {
      const food = await this.db.food.findUnique({
        where: { id: data.foodId },
        select: {
          calories: true,
          protein: true,
          carbohydrates: true,
          fat: true,
        },
      });

      if (!food) {
        throw new NotFoundException('Food not found');
      }

      const servings = data.servings || 1;
      totalCalories = Math.round(food.calories * servings);
      totalProtein = Math.round(food.protein * servings * 10) / 10;
      totalCarbs = Math.round(food.carbohydrates * servings * 10) / 10;
      totalFat = Math.round(food.fat * servings * 10) / 10;
    } else if (data.quickAddCalories !== undefined) {
      totalCalories = data.quickAddCalories;
      totalProtein = data.quickAddProtein || 0;
      totalCarbs = data.quickAddCarbs || 0;
      totalFat = data.quickAddFat || 0;
    }

    const log = await this.db.foodLog.create({
      data: {
        userId,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
        mealType: data.mealType,
        foodId: data.foodId,
        servings: data.servings || 1,
        servingSize: data.servingSize,
        servingUnit: data.servingUnit,
        quickAddName: data.quickAddName,
        quickAddCalories: data.quickAddCalories,
        quickAddProtein: data.quickAddProtein,
        quickAddCarbs: data.quickAddCarbs,
        quickAddFat: data.quickAddFat,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        note: data.note,
        ...this.encryptFoodDetails(data.quickAddName, data.note),
      },
      select: foodLogSelect,
    });

    // Check NUTRITION achievements (e.g. Calorie Counter, Nutrition Nerd)
    const foodLogCount = await this.db.foodLog.count({ where: { userId } });
    this.achievementsService
      .checkAndAward(userId, 'NUTRITION', foodLogCount)
      .catch(() => {});

    return {
      success: true,
      data: this.formatLogResponse(log),
    };
  }

  /**
   * Get daily nutrition summary
   */
  async getDailySummary(
    userId: string,
    query: FoodLogQuery,
  ): Promise<SuccessResponse<DailyNutritionSummary>> {
    let date = query.date;
    if (!date) {
      const profile = await this.db.profile.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      date = getTodayInTimezone(getEffectiveTimezone(profile?.timezone));
    }
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const [logs, goal] = await Promise.all([
      this.db.foodLog.findMany({
        where: {
          userId,
          loggedAt: { gte: startOfDay, lte: endOfDay },
        },
        select: foodLogSelect,
        orderBy: { loggedAt: 'asc' },
      }),
      this.db.nutritionGoal.findUnique({
        where: { userId },
        select: nutritionGoalSelect,
      }),
    ]);

    // Group logs by meal type
    const mealLogs: Record<MealType, FoodLogResponse[]> = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
      SNACKS: [],
    };

    for (const log of logs) {
      const formatted = this.formatLogResponse(log);
      mealLogs[log.mealType as MealType].push(formatted);
    }

    // Calculate meal summaries
    const createMealSummary = (
      mealType: MealType,
      logs: FoodLogResponse[],
    ): MealSummary => ({
      mealType,
      logs,
      totalCalories: logs.reduce((sum, l) => sum + l.totalCalories, 0),
      totalProtein: logs.reduce((sum, l) => sum + l.totalProtein, 0),
      totalCarbs: logs.reduce((sum, l) => sum + l.totalCarbs, 0),
      totalFat: logs.reduce((sum, l) => sum + l.totalFat, 0),
    });

    const meals = {
      breakfast: createMealSummary('BREAKFAST', mealLogs.BREAKFAST),
      lunch: createMealSummary('LUNCH', mealLogs.LUNCH),
      dinner: createMealSummary('DINNER', mealLogs.DINNER),
      snacks: createMealSummary('SNACKS', mealLogs.SNACKS),
    };

    // Calculate daily totals
    const totals = {
      calories: Object.values(meals).reduce(
        (sum, m) => sum + m.totalCalories,
        0,
      ),
      protein: Object.values(meals).reduce((sum, m) => sum + m.totalProtein, 0),
      carbs: Object.values(meals).reduce((sum, m) => sum + m.totalCarbs, 0),
      fat: Object.values(meals).reduce((sum, m) => sum + m.totalFat, 0),
    };

    // Default goal if none set
    const defaultGoal = {
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 65,
    };

    const targets = goal || defaultGoal;

    // Calculate progress percentages
    const progress = {
      calories: Math.round((totals.calories / targets.targetCalories) * 100),
      protein: Math.round((totals.protein / targets.targetProtein) * 100),
      carbs: Math.round((totals.carbs / targets.targetCarbs) * 100),
      fat: Math.round((totals.fat / targets.targetFat) * 100),
    };

    // Calculate remaining
    const remaining = {
      calories: Math.max(0, targets.targetCalories - totals.calories),
      protein: Math.max(0, targets.targetProtein - totals.protein),
      carbs: Math.max(0, targets.targetCarbs - totals.carbs),
      fat: Math.max(0, targets.targetFat - totals.fat),
    };

    return {
      success: true,
      data: {
        date,
        meals,
        totals,
        goal: goal as NutritionGoalResponse | null,
        progress,
        remaining,
      },
    };
  }

  /**
   * Update food log entry
   */
  async updateLog(
    userId: string,
    logId: string,
    data: UpdateFoodLog,
  ): Promise<SuccessResponse<FoodLogResponse>> {
    const existing = await this.db.foodLog.findFirst({
      where: { id: logId, userId },
      include: { food: true },
    });

    if (!existing) {
      throw new NotFoundException('Food log not found');
    }

    // Recalculate totals if servings changed
    let updateData: Record<string, unknown> = { ...data };

    if (data.servings && existing.food) {
      updateData = {
        ...updateData,
        totalCalories: Math.round(existing.food.calories * data.servings),
        totalProtein:
          Math.round(existing.food.protein * data.servings * 10) / 10,
        totalCarbs:
          Math.round(existing.food.carbohydrates * data.servings * 10) / 10,
        totalFat: Math.round(existing.food.fat * data.servings * 10) / 10,
      };
    }

    // Re-encrypt text fields if note changed (GDPR Art. 32)
    if (data.note !== undefined) {
      const name = existing.quickAddName;
      const note = data.note ?? existing.note;
      Object.assign(updateData, this.encryptFoodDetails(name, note));
    }

    const log = await this.db.foodLog.update({
      where: { id: logId },
      data: updateData,
      select: foodLogSelect,
    });

    return {
      success: true,
      data: this.formatLogResponse(log),
    };
  }

  /**
   * Delete food log entry
   */
  async deleteLog(
    userId: string,
    logId: string,
  ): Promise<SuccessResponse<{ message: string }>> {
    const existing = await this.db.foodLog.findFirst({
      where: { id: logId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Food log not found');
    }

    await this.db.foodLog.delete({ where: { id: logId } });

    return {
      success: true,
      data: { message: 'Food log deleted' },
    };
  }

  // ==================== Nutrition Goals ====================

  /**
   * Get nutrition goal
   */
  async getGoal(
    userId: string,
  ): Promise<SuccessResponse<NutritionGoalResponse>> {
    let goal = await this.db.nutritionGoal.findUnique({
      where: { userId },
      select: nutritionGoalSelect,
    });

    if (!goal) {
      // Create default goal
      goal = await this.db.nutritionGoal.create({
        data: { userId },
        select: nutritionGoalSelect,
      });
    }

    return {
      success: true,
      data: goal as NutritionGoalResponse,
    };
  }

  /**
   * Update nutrition goal
   */
  async updateGoal(
    userId: string,
    data: UpdateNutritionGoal,
  ): Promise<SuccessResponse<NutritionGoalResponse>> {
    const goal = await this.db.nutritionGoal.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      select: nutritionGoalSelect,
    });

    return {
      success: true,
      data: goal as NutritionGoalResponse,
    };
  }

  // ==================== Favorites ====================

  /**
   * Get favorite foods
   */
  async getFavorites(
    userId: string,
  ): Promise<SuccessResponse<FavoriteFoodResponse[]>> {
    const favorites = await this.db.userFavoriteFood.findMany({
      where: { userId },
      select: favoriteFoodSelect,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: favorites.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
      })) as unknown as FavoriteFoodResponse[],
    };
  }

  /**
   * Add favorite food
   */
  async addFavorite(
    userId: string,
    data: AddFavoriteFood,
  ): Promise<SuccessResponse<FavoriteFoodResponse>> {
    // Check if food exists
    const food = await this.db.food.findUnique({
      where: { id: data.foodId },
    });

    if (!food) {
      throw new NotFoundException('Food not found');
    }

    const favorite = await this.db.userFavoriteFood.upsert({
      where: { userId_foodId: { userId, foodId: data.foodId } },
      create: {
        userId,
        foodId: data.foodId,
        defaultServings: data.defaultServings,
        defaultServingUnit: data.defaultServingUnit,
      },
      update: {
        defaultServings: data.defaultServings,
        defaultServingUnit: data.defaultServingUnit,
      },
      select: favoriteFoodSelect,
    });

    return {
      success: true,
      data: {
        ...favorite,
        createdAt: favorite.createdAt.toISOString(),
      } as unknown as FavoriteFoodResponse,
    };
  }

  /**
   * Remove favorite food
   */
  async removeFavorite(
    userId: string,
    foodId: string,
  ): Promise<SuccessResponse<{ message: string }>> {
    await this.db.userFavoriteFood.deleteMany({
      where: { userId, foodId },
    });

    return {
      success: true,
      data: { message: 'Favorite removed' },
    };
  }

  // ==================== Recent Foods ====================

  /**
   * Get recent foods (based on food log history)
   */
  async getRecentFoods(
    userId: string,
    limit = 10,
  ): Promise<SuccessResponse<RecentFoodResponse[]>> {
    // Get recent food logs with distinct foods
    const recentLogs = await this.db.foodLog.findMany({
      where: {
        userId,
        foodId: { not: null },
      },
      select: {
        foodId: true,
        loggedAt: true,
        food: {
          select: foodListSelect,
        },
      },
      orderBy: { loggedAt: 'desc' },
      take: 50, // Get more to count usage
    });

    // Group by food and count
    const foodMap = new Map<
      string,
      { food: unknown; lastUsed: Date; count: number }
    >();

    for (const log of recentLogs) {
      if (!log.foodId || !log.food) continue;

      const existing = foodMap.get(log.foodId);
      if (existing) {
        existing.count++;
        if (log.loggedAt > existing.lastUsed) {
          existing.lastUsed = log.loggedAt;
        }
      } else {
        foodMap.set(log.foodId, {
          food: log.food,
          lastUsed: log.loggedAt,
          count: 1,
        });
      }
    }

    // Sort by last used and take limit
    const recent = Array.from(foodMap.values())
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, limit)
      .map((r) => ({
        food: r.food,
        lastUsed: r.lastUsed.toISOString(),
        useCount: r.count,
      }));

    return {
      success: true,
      data: recent as unknown as RecentFoodResponse[],
    };
  }

  /**
   * Get daily nutrition totals over a date range (for trend charts).
   */
  async getHistory(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<
    SuccessResponse<{
      days: Array<{
        date: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }>;
    }>
  > {
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const logs = await this.db.foodLog.findMany({
      where: { userId, loggedAt: { gte: start, lte: end } },
      select: {
        totalCalories: true,
        totalProtein: true,
        totalCarbs: true,
        totalFat: true,
        loggedAt: true,
      },
      orderBy: { loggedAt: 'asc' },
    });

    // Bucket by date
    const buckets: Record<
      string,
      { calories: number; protein: number; carbs: number; fat: number }
    > = {};
    const cursor = new Date(start);
    while (cursor <= end) {
      buckets[this.formatDate(cursor)] = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const log of logs) {
      const key = this.formatDate(log.loggedAt);
      if (buckets[key]) {
        buckets[key].calories += log.totalCalories ?? 0;
        buckets[key].protein += log.totalProtein ?? 0;
        buckets[key].carbs += log.totalCarbs ?? 0;
        buckets[key].fat += log.totalFat ?? 0;
      }
    }

    const days = Object.entries(buckets).map(([date, totals]) => ({
      date,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
    }));

    return { success: true, data: { days } };
  }

  // ==================== Private Helpers ====================

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatLogResponse(log: Record<string, unknown>): FoodLogResponse {
    return {
      ...log,
      loggedAt: (log.loggedAt as Date).toISOString(),
    } as unknown as FoodLogResponse;
  }

  private encryptFoodDetails(
    quickAddName?: string | null,
    note?: string | null,
  ) {
    if (!quickAddName && !note) return {};
    const payload = JSON.stringify({ quickAddName, note });
    const enc = this.encryption.encrypt(payload);
    return {
      eFoodDetails: enc.encryptedContent,
      foodDetailsIv: enc.contentIv,
      foodDetailsAuthTag: enc.contentAuthTag,
      foodDetailsWrappedKey: enc.wrappedKey,
    };
  }
}

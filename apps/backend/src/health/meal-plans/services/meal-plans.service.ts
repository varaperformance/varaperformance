import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  mealPlanSelect,
  mealPlanListSelect,
  mealPlanItemSelect,
} from '../selectors/meal-plans.selector';
import type {
  CreateMealPlan,
  UpdateMealPlan,
  CreateMealPlanItem,
  UpdateMealPlanItem,
  CopyMealPlanDay,
  QuickLogMealPlan,
  GenerateFromMacros,
  MealType,
} from '@varaperformance/core';
import type {
  MealPlanResponse,
  MealPlanListItem,
  MealPlanItemResponse,
  SuccessResponse,
  FoodLogResponse,
} from '@varaperformance/core';

@Injectable()
export class MealPlansService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== MEAL PLANS ====================

  async create(
    userId: string,
    data: CreateMealPlan,
  ): Promise<SuccessResponse<MealPlanResponse>> {
    const plan = await this.db.mealPlan.create({
      data: { userId, name: data.name },
      select: mealPlanSelect,
    });

    return { success: true, data: this.formatPlanResponse(plan) };
  }

  async findAll(userId: string): Promise<SuccessResponse<MealPlanListItem[]>> {
    const plans = await this.db.mealPlan.findMany({
      where: { userId },
      select: mealPlanListSelect,
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      success: true,
      data: plans.map((p) => {
        const uniqueDays = new Set(p.items.map((i) => i.dayOfWeek));
        const avgDaily =
          uniqueDays.size > 0
            ? p.items.reduce((sum, i) => sum + i.totalCalories, 0) /
              uniqueDays.size
            : 0;

        return {
          id: p.id,
          name: p.name,
          isActive: p.isActive,
          itemCount: p._count.items,
          totalDailyCalories: Math.round(avgDaily),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
    };
  }

  async findOne(
    userId: string,
    planId: string,
  ): Promise<SuccessResponse<MealPlanResponse>> {
    const plan = await this.db.mealPlan.findFirst({
      where: { id: planId, userId },
      select: mealPlanSelect,
    });

    if (!plan) throw new NotFoundException('Meal plan not found');

    return { success: true, data: this.formatPlanResponse(plan) };
  }

  async getActive(
    userId: string,
  ): Promise<SuccessResponse<MealPlanResponse | null>> {
    const plan = await this.db.mealPlan.findFirst({
      where: { userId, isActive: true },
      select: mealPlanSelect,
    });

    return {
      success: true,
      data: plan ? this.formatPlanResponse(plan) : null,
    };
  }

  async update(
    userId: string,
    planId: string,
    data: UpdateMealPlan,
  ): Promise<SuccessResponse<MealPlanResponse>> {
    const existing = await this.db.mealPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!existing) throw new NotFoundException('Meal plan not found');

    // If activating this plan, deactivate others
    if (data.isActive === true) {
      await this.db.mealPlan.updateMany({
        where: { userId, isActive: true, id: { not: planId } },
        data: { isActive: false },
      });
    }

    const plan = await this.db.mealPlan.update({
      where: { id: planId },
      data,
      select: mealPlanSelect,
    });

    return { success: true, data: this.formatPlanResponse(plan) };
  }

  async delete(
    userId: string,
    planId: string,
  ): Promise<SuccessResponse<{ message: string }>> {
    const existing = await this.db.mealPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!existing) throw new NotFoundException('Meal plan not found');

    await this.db.mealPlan.delete({ where: { id: planId } });

    return { success: true, data: { message: 'Meal plan deleted' } };
  }

  // ==================== MEAL PLAN ITEMS ====================

  async addItem(
    userId: string,
    planId: string,
    data: CreateMealPlanItem,
  ): Promise<SuccessResponse<MealPlanItemResponse>> {
    const plan = await this.db.mealPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!plan) throw new NotFoundException('Meal plan not found');

    const { totalCalories, totalProtein, totalCarbs, totalFat } =
      await this.calculateItemNutrition(data);

    const item = await this.db.mealPlanItem.create({
      data: {
        mealPlanId: planId,
        dayOfWeek: data.dayOfWeek,
        mealType: data.mealType,
        sortOrder: data.sortOrder ?? 0,
        foodId: data.foodId,
        recipeId: data.recipeId,
        servings: data.servings ?? 1,
        customName: data.customName,
        customCalories: data.customCalories,
        customProtein: data.customProtein,
        customCarbs: data.customCarbs,
        customFat: data.customFat,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      },
      select: mealPlanItemSelect,
    });

    return { success: true, data: this.formatItemResponse(item) };
  }

  async updateItem(
    userId: string,
    planId: string,
    itemId: string,
    data: UpdateMealPlanItem,
  ): Promise<SuccessResponse<MealPlanItemResponse>> {
    const item = await this.db.mealPlanItem.findFirst({
      where: { id: itemId, mealPlan: { id: planId, userId } },
      include: { food: true, mealPlan: true },
    });
    if (!item) throw new NotFoundException('Meal plan item not found');

    const updateData: Record<string, unknown> = { ...data };

    // Recalculate totals if servings changed
    if (data.servings) {
      if (item.foodId && item.food) {
        updateData.totalCalories = Math.round(
          item.food.calories * data.servings,
        );
        updateData.totalProtein =
          Math.round(item.food.protein * data.servings * 10) / 10;
        updateData.totalCarbs =
          Math.round(item.food.carbohydrates * data.servings * 10) / 10;
        updateData.totalFat =
          Math.round(item.food.fat * data.servings * 10) / 10;
      } else if (item.recipeId) {
        const recipe = await this.db.recipe.findUnique({
          where: { id: item.recipeId },
        });
        if (recipe) {
          updateData.totalCalories = Math.round(
            recipe.perServingCalories * data.servings,
          );
          updateData.totalProtein =
            Math.round(recipe.perServingProtein * data.servings * 10) / 10;
          updateData.totalCarbs =
            Math.round(recipe.perServingCarbs * data.servings * 10) / 10;
          updateData.totalFat =
            Math.round(recipe.perServingFat * data.servings * 10) / 10;
        }
      } else if (item.customCalories != null) {
        updateData.totalCalories = Math.round(
          item.customCalories * data.servings,
        );
        updateData.totalProtein =
          Math.round((item.customProtein ?? 0) * data.servings * 10) / 10;
        updateData.totalCarbs =
          Math.round((item.customCarbs ?? 0) * data.servings * 10) / 10;
        updateData.totalFat =
          Math.round((item.customFat ?? 0) * data.servings * 10) / 10;
      }
    }

    const updated = await this.db.mealPlanItem.update({
      where: { id: itemId },
      data: updateData,
      select: mealPlanItemSelect,
    });

    return { success: true, data: this.formatItemResponse(updated) };
  }

  async removeItem(
    userId: string,
    planId: string,
    itemId: string,
  ): Promise<SuccessResponse<{ message: string }>> {
    const item = await this.db.mealPlanItem.findFirst({
      where: { id: itemId, mealPlan: { id: planId, userId } },
    });
    if (!item) throw new NotFoundException('Meal plan item not found');

    await this.db.mealPlanItem.delete({ where: { id: itemId } });

    return { success: true, data: { message: 'Item removed' } };
  }

  // ==================== COPY DAY ====================

  async copyDay(
    userId: string,
    planId: string,
    data: CopyMealPlanDay,
  ): Promise<SuccessResponse<MealPlanResponse>> {
    const plan = await this.db.mealPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!plan) throw new NotFoundException('Meal plan not found');

    if (data.targetDays.includes(data.sourceDay)) {
      throw new BadRequestException(
        'Target days cannot include the source day',
      );
    }

    const sourceItems = await this.db.mealPlanItem.findMany({
      where: { mealPlanId: planId, dayOfWeek: data.sourceDay },
    });

    if (sourceItems.length === 0) {
      throw new NotFoundException('No items found for the source day');
    }

    // Delete existing items on target days, then copy
    await this.db.mealPlanItem.deleteMany({
      where: {
        mealPlanId: planId,
        dayOfWeek: { in: data.targetDays },
      },
    });

    const newItems = data.targetDays.flatMap((targetDay) =>
      sourceItems.map((item) => ({
        mealPlanId: planId,
        dayOfWeek: targetDay,
        mealType: item.mealType,
        sortOrder: item.sortOrder,
        foodId: item.foodId,
        recipeId: item.recipeId,
        servings: item.servings,
        customName: item.customName,
        customCalories: item.customCalories,
        customProtein: item.customProtein,
        customCarbs: item.customCarbs,
        customFat: item.customFat,
        totalCalories: item.totalCalories,
        totalProtein: item.totalProtein,
        totalCarbs: item.totalCarbs,
        totalFat: item.totalFat,
      })),
    );

    await this.db.mealPlanItem.createMany({ data: newItems });

    // Return the updated plan
    const updated = await this.db.mealPlan.findUnique({
      where: { id: planId },
      select: mealPlanSelect,
    });

    return {
      success: true,
      data: this.formatPlanResponse(updated! as Record<string, unknown>),
    };
  }

  // ==================== QUICK LOG TO DIARY ====================

  async quickLog(
    userId: string,
    planId: string,
    data: QuickLogMealPlan,
  ): Promise<SuccessResponse<FoodLogResponse[]>> {
    const plan = await this.db.mealPlan.findFirst({
      where: { id: planId, userId },
      select: mealPlanSelect,
    });
    if (!plan) throw new NotFoundException('Meal plan not found');

    const logDate = data.date ? new Date(data.date) : new Date();
    const targetDay = data.dayOfWeek ?? logDate.getDay();

    // Filter items by day and optionally meal type
    let items = plan.items.filter((i) => i.dayOfWeek === targetDay);
    if (data.mealType) {
      items = items.filter((i) => i.mealType === data.mealType);
    }

    if (items.length === 0) {
      throw new NotFoundException('No meal plan items for the selected day');
    }

    // Create food log entries for each item
    const logs = await Promise.all(
      items.map((item) =>
        this.db.foodLog.create({
          data: {
            userId,
            loggedAt: logDate,
            mealType: item.mealType,
            foodId: item.food?.id ?? null,
            recipeId: item.recipe?.id ?? null,
            servings: item.servings,
            quickAddName: item.customName,
            quickAddCalories: item.customCalories,
            quickAddProtein: item.customProtein,
            quickAddCarbs: item.customCarbs,
            quickAddFat: item.customFat,
            totalCalories: item.totalCalories,
            totalProtein: item.totalProtein,
            totalCarbs: item.totalCarbs,
            totalFat: item.totalFat,
          },
          select: {
            id: true,
            loggedAt: true,
            mealType: true,
            recipeId: true,
            recipe: {
              select: { id: true, name: true, imageUrl: true },
            },
            food: {
              select: {
                id: true,
                name: true,
                brand: true,
                barcode: true,
                calories: true,
                protein: true,
                carbohydrates: true,
                fat: true,
                servingSize: true,
                servingUnit: true,
                servingLabel: true,
                isVerified: true,
                isPrivate: true,
                createdById: true,
                source: true,
              },
            },
            servings: true,
            servingSize: true,
            servingUnit: true,
            quickAddName: true,
            quickAddCalories: true,
            quickAddProtein: true,
            quickAddCarbs: true,
            quickAddFat: true,
            totalCalories: true,
            totalProtein: true,
            totalCarbs: true,
            totalFat: true,
            note: true,
          },
        }),
      ),
    );

    return {
      success: true,
      data: logs.map((l) => ({
        ...l,
        loggedAt: l.loggedAt.toISOString(),
      })) as unknown as FoodLogResponse[],
    };
  }

  // ==================== AUTO-GENERATE FROM MACROS ====================

  async generateFromMacros(
    userId: string,
    data: GenerateFromMacros,
  ): Promise<SuccessResponse<MealPlanResponse>> {
    // 1. Fetch nutrition goals
    const goals = await this.db.nutritionGoal.findUnique({
      where: { userId },
    });

    const targetCalories = goals?.targetCalories ?? 2000;
    const targetProtein = goals?.targetProtein ?? 150;
    const targetCarbs = goals?.targetCarbs ?? 200;
    const targetFat = goals?.targetFat ?? 65;

    const mealSplit: Record<string, number> = {
      BREAKFAST: (goals?.breakfastPercent ?? 25) / 100,
      LUNCH: (goals?.lunchPercent ?? 35) / 100,
      DINNER: (goals?.dinnerPercent ?? 30) / 100,
      SNACKS: (goals?.snacksPercent ?? 10) / 100,
    };

    // 2. Build candidate pool: favorites → saved recipes → recently logged foods
    const [favorites, savedRecipes, recentLogs] = await Promise.all([
      this.db.userFavoriteFood.findMany({
        where: { userId },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              calories: true,
              protein: true,
              carbohydrates: true,
              fat: true,
            },
          },
        },
      }),
      this.db.userSavedRecipe.findMany({
        where: { userId },
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
              perServingCalories: true,
              perServingProtein: true,
              perServingCarbs: true,
              perServingFat: true,
            },
          },
        },
      }),
      this.db.foodLog.findMany({
        where: {
          userId,
          loggedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          foodId: { not: null },
        },
        distinct: ['foodId'],
        take: 50,
        orderBy: { loggedAt: 'desc' },
        select: {
          food: {
            select: {
              id: true,
              name: true,
              calories: true,
              protein: true,
              carbohydrates: true,
              fat: true,
            },
          },
        },
      }),
    ]);

    // Normalize candidates into a common shape
    type Candidate = {
      type: 'food' | 'recipe';
      id: string;
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };

    const seen = new Set<string>();
    const candidates: Candidate[] = [];

    for (const fav of favorites) {
      if (!fav.food || seen.has(`food:${fav.food.id}`)) continue;
      seen.add(`food:${fav.food.id}`);
      candidates.push({
        type: 'food',
        id: fav.food.id,
        name: fav.food.name,
        calories: fav.food.calories,
        protein: fav.food.protein,
        carbs: fav.food.carbohydrates,
        fat: fav.food.fat,
      });
    }

    for (const sr of savedRecipes) {
      if (!sr.recipe || seen.has(`recipe:${sr.recipe.id}`)) continue;
      seen.add(`recipe:${sr.recipe.id}`);
      candidates.push({
        type: 'recipe',
        id: sr.recipe.id,
        name: sr.recipe.name,
        calories: sr.recipe.perServingCalories,
        protein: sr.recipe.perServingProtein,
        carbs: sr.recipe.perServingCarbs,
        fat: sr.recipe.perServingFat,
      });
    }

    // Fallback: recent food logs
    for (const log of recentLogs) {
      if (!log.food || seen.has(`food:${log.food.id}`)) continue;
      seen.add(`food:${log.food.id}`);
      candidates.push({
        type: 'food',
        id: log.food.id,
        name: log.food.name,
        calories: log.food.calories,
        protein: log.food.protein,
        carbs: log.food.carbohydrates,
        fat: log.food.fat,
      });
    }

    if (candidates.length === 0) {
      throw new BadRequestException(
        'No favorite foods, saved recipes, or recent food logs found. ' +
          'Add some favorites or log foods first, then try again.',
      );
    }

    // 3. Create the plan
    const plan = await this.db.mealPlan.create({
      data: { userId, name: data.name ?? 'Auto-generated Plan' },
    });

    // 4. Greedy allocation per day
    const days = data.days ?? [0, 1, 2, 3, 4, 5, 6];
    const mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'];
    const allItemData: Array<Record<string, unknown>> = [];

    // Generate one template day, optionally reuse for all days
    const templateDay = this.allocateDay(
      candidates,
      mealTypes,
      mealSplit,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
    );

    for (const dayOfWeek of days) {
      const dayAllocation = data.varyByDay
        ? this.allocateDay(
            candidates,
            mealTypes,
            mealSplit,
            targetCalories,
            targetProtein,
            targetCarbs,
            targetFat,
          )
        : templateDay;

      for (const entry of dayAllocation) {
        allItemData.push({
          mealPlanId: plan.id,
          dayOfWeek,
          mealType: entry.mealType,
          sortOrder: entry.sortOrder,
          foodId: entry.type === 'food' ? entry.id : null,
          recipeId: entry.type === 'recipe' ? entry.id : null,
          servings: entry.servings,
          customName: null,
          customCalories: null,
          customProtein: null,
          customCarbs: null,
          customFat: null,
          totalCalories: entry.totalCalories,
          totalProtein: entry.totalProtein,
          totalCarbs: entry.totalCarbs,
          totalFat: entry.totalFat,
        });
      }
    }

    if (allItemData.length > 0) {
      await this.db.mealPlanItem.createMany({ data: allItemData as never[] });
    }

    // 5. Return the full plan
    const full = await this.db.mealPlan.findUnique({
      where: { id: plan.id },
      select: mealPlanSelect,
    });

    return {
      success: true,
      data: this.formatPlanResponse(full! as Record<string, unknown>),
    };
  }

  /**
   * Greedy allocation: for each meal slot, pick the best-fitting candidate(s)
   * to fill the calorie budget, adjusting servings to match.
   */
  private allocateDay(
    candidates: Array<{
      type: 'food' | 'recipe';
      id: string;
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>,
    mealTypes: MealType[],
    mealSplit: Record<string, number>,
    targetCalories: number,
    targetProtein: number,
    targetCarbs: number,
    targetFat: number,
  ) {
    const result: Array<{
      mealType: MealType;
      sortOrder: number;
      type: 'food' | 'recipe';
      id: string;
      servings: number;
      totalCalories: number;
      totalProtein: number;
      totalCarbs: number;
      totalFat: number;
    }> = [];

    const usedInDay = new Set<string>();

    for (const mealType of mealTypes) {
      const mealCalBudget = targetCalories * (mealSplit[mealType] ?? 0.25);
      const mealProtBudget = targetProtein * (mealSplit[mealType] ?? 0.25);
      const mealCarbBudget = targetCarbs * (mealSplit[mealType] ?? 0.25);
      const mealFatBudget = targetFat * (mealSplit[mealType] ?? 0.25);

      let remainingCal = mealCalBudget;
      let sortOrder = 0;

      // Fill the meal with 1-3 items
      const maxItems = mealType === 'SNACKS' ? 2 : 3;

      for (let i = 0; i < maxItems && remainingCal > 50; i++) {
        // Score candidates
        const sliceBudgetCal = remainingCal / (maxItems - i);
        const sliceBudgetProt = mealProtBudget / maxItems;
        const sliceBudgetCarb = mealCarbBudget / maxItems;
        const sliceBudgetFat = mealFatBudget / maxItems;

        let bestCandidate = candidates[0];
        let bestScore = -Infinity;
        let bestServings = 1;

        for (const c of candidates) {
          if (c.calories <= 0) continue;

          // Penalty for reuse within same day
          const reuseKey = `${c.type}:${c.id}`;
          const reusePenalty = usedInDay.has(reuseKey) ? 0.5 : 0;

          // Ideal servings to hit calorie target for this slice
          const idealServings = Math.max(
            0.5,
            Math.min(4, sliceBudgetCal / c.calories),
          );
          // Round to nearest 0.5
          const servings = Math.round(idealServings * 2) / 2 || 0.5;

          const calDiff = Math.abs(c.calories * servings - sliceBudgetCal);
          const protDiff = Math.abs(c.protein * servings - sliceBudgetProt);
          const carbDiff = Math.abs(c.carbs * servings - sliceBudgetCarb);
          const fatDiff = Math.abs(c.fat * servings - sliceBudgetFat);

          // Weighted score: lower diff = better. Negate so higher = better.
          const score =
            -(calDiff * 1.0 + protDiff * 2.0 + carbDiff * 1.0 + fatDiff * 1.0) -
            reusePenalty * 500;

          if (score > bestScore) {
            bestScore = score;
            bestCandidate = c;
            bestServings = servings;
          }
        }

        if (bestCandidate) {
          const totalCal = Math.round(bestCandidate.calories * bestServings);
          const totalProt =
            Math.round(bestCandidate.protein * bestServings * 10) / 10;
          const totalCarbs =
            Math.round(bestCandidate.carbs * bestServings * 10) / 10;
          const totalFat =
            Math.round(bestCandidate.fat * bestServings * 10) / 10;

          result.push({
            mealType,
            sortOrder,
            type: bestCandidate.type,
            id: bestCandidate.id,
            servings: bestServings,
            totalCalories: totalCal,
            totalProtein: totalProt,
            totalCarbs: totalCarbs,
            totalFat: totalFat,
          });

          usedInDay.add(`${bestCandidate.type}:${bestCandidate.id}`);
          remainingCal -= totalCal;
          sortOrder++;
        }
      }
    }

    return result;
  }

  // ==================== PRIVATE HELPERS ====================

  private async calculateItemNutrition(data: CreateMealPlanItem) {
    const servings = data.servings ?? 1;

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
      if (!food) throw new NotFoundException('Food not found');

      return {
        totalCalories: Math.round(food.calories * servings),
        totalProtein: Math.round(food.protein * servings * 10) / 10,
        totalCarbs: Math.round(food.carbohydrates * servings * 10) / 10,
        totalFat: Math.round(food.fat * servings * 10) / 10,
      };
    }

    if (data.recipeId) {
      const recipe = await this.db.recipe.findUnique({
        where: { id: data.recipeId },
        select: {
          perServingCalories: true,
          perServingProtein: true,
          perServingCarbs: true,
          perServingFat: true,
        },
      });
      if (!recipe) throw new NotFoundException('Recipe not found');

      return {
        totalCalories: Math.round(recipe.perServingCalories * servings),
        totalProtein: Math.round(recipe.perServingProtein * servings * 10) / 10,
        totalCarbs: Math.round(recipe.perServingCarbs * servings * 10) / 10,
        totalFat: Math.round(recipe.perServingFat * servings * 10) / 10,
      };
    }

    // Custom item
    return {
      totalCalories: Math.round((data.customCalories ?? 0) * servings),
      totalProtein: Math.round((data.customProtein ?? 0) * servings * 10) / 10,
      totalCarbs: Math.round((data.customCarbs ?? 0) * servings * 10) / 10,
      totalFat: Math.round((data.customFat ?? 0) * servings * 10) / 10,
    };
  }

  private formatPlanResponse(plan: Record<string, unknown>): MealPlanResponse {
    const items = (plan.items as Record<string, unknown>[]).map((item) =>
      this.formatItemResponse(item),
    );

    return {
      id: plan.id as string,
      name: plan.name as string,
      isActive: plan.isActive as boolean,
      items,
      createdAt: (plan.createdAt as Date).toISOString(),
      updatedAt: (plan.updatedAt as Date).toISOString(),
    };
  }

  private formatItemResponse(
    item: Record<string, unknown>,
  ): MealPlanItemResponse {
    const recipe = item.recipe as Record<string, unknown> | null;

    return {
      id: item.id as string,
      dayOfWeek: item.dayOfWeek as number,
      mealType: item.mealType as MealType,
      sortOrder: item.sortOrder as number,
      food: item.food as MealPlanItemResponse['food'],
      recipe: recipe
        ? {
            id: recipe.id as string,
            name: recipe.name as string,
            imageUrl: recipe.imageUrl as string | null,
            perServing: {
              calories: recipe.perServingCalories as number,
              protein: recipe.perServingProtein as number,
              carbs: recipe.perServingCarbs as number,
              fat: recipe.perServingFat as number,
            },
          }
        : null,
      servings: item.servings as number,
      customName: item.customName as string | null,
      customCalories: item.customCalories as number | null,
      customProtein: item.customProtein as number | null,
      customCarbs: item.customCarbs as number | null,
      customFat: item.customFat as number | null,
      totalCalories: item.totalCalories as number,
      totalProtein: item.totalProtein as number,
      totalCarbs: item.totalCarbs as number,
      totalFat: item.totalFat as number,
    };
  }
}

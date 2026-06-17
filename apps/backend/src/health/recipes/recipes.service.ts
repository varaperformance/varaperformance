import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  CreateRecipe,
  UpdateRecipe,
  SearchRecipes,
  LogRecipe,
  FoodListItem,
  RecipeResponse,
  RecipeListItem,
  RecipeCategoryResponse,
  RecipeSearchResult,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';
import { recipeListSelect, recipeSelect } from './selectors/recipe.selector';

@Injectable()
export class RecipesService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    data: CreateRecipe,
  ): Promise<SuccessResponse<RecipeResponse> | ErrorResponse> {
    const normalizedIngredients = data.ingredients.map((ingredient, index) => ({
      ...ingredient,
      sortOrder: ingredient.sortOrder ?? index,
    }));

    const foods = await this.db.food.findMany({
      where: {
        id: {
          in: normalizedIngredients.map((ingredient) => ingredient.foodId),
        },
        OR: [{ isPrivate: false }, { createdById: userId }],
      },
      select: {
        id: true,
        calories: true,
        protein: true,
        carbohydrates: true,
        fat: true,
      },
    });

    if (foods.length !== normalizedIngredients.length) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message:
            'One or more ingredients were not found or are not accessible',
        },
      };
    }

    const foodMap = new Map(foods.map((food) => [food.id, food]));
    const computedIngredients = normalizedIngredients.map((ingredient) => {
      const food = foodMap.get(ingredient.foodId)!;
      const multiplier = ingredient.quantity;
      const totalCalories = this.roundToOne(food.calories * multiplier);
      const totalProtein = this.roundToOne(food.protein * multiplier);
      const totalCarbs = this.roundToOne(food.carbohydrates * multiplier);
      const totalFat = this.roundToOne(food.fat * multiplier);

      return {
        ...ingredient,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      };
    });

    const totals = computedIngredients.reduce(
      (acc, ingredient) => ({
        calories: this.roundToOne(acc.calories + ingredient.totalCalories),
        protein: this.roundToOne(acc.protein + ingredient.totalProtein),
        carbs: this.roundToOne(acc.carbs + ingredient.totalCarbs),
        fat: this.roundToOne(acc.fat + ingredient.totalFat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    const totalServings = data.totalServings;
    const perServing = {
      calories: this.roundToOne(totals.calories / totalServings),
      protein: this.roundToOne(totals.protein / totalServings),
      carbs: this.roundToOne(totals.carbs / totalServings),
      fat: this.roundToOne(totals.fat / totalServings),
    };

    const created = await this.db.recipe.create({
      data: {
        createdById: userId,
        name: data.name,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        directions: data.directions,
        totalServings,
        isPublic: data.isPublic,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        perServingCalories: perServing.calories,
        perServingProtein: perServing.protein,
        perServingCarbs: perServing.carbs,
        perServingFat: perServing.fat,
        ingredients: {
          create: computedIngredients.map((ingredient) => ({
            foodId: ingredient.foodId,
            quantity: ingredient.quantity,
            note: ingredient.note ?? null,
            sortOrder: ingredient.sortOrder,
            totalCalories: ingredient.totalCalories,
            totalProtein: ingredient.totalProtein,
            totalCarbs: ingredient.totalCarbs,
            totalFat: ingredient.totalFat,
          })),
        },
        ...(data.categoryIds?.length && {
          categories: {
            create: data.categoryIds.map((id) => ({
              recipeCategoryId: id,
            })),
          },
        }),
      },
      select: recipeSelect,
    });

    return { success: true, data: this.formatRecipe(created, userId) };
  }

  async search(
    userId: string,
    query: SearchRecipes,
  ): Promise<SuccessResponse<RecipeSearchResult>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.query) {
      where.OR = [
        { name: { contains: query.query, mode: 'insensitive' } },
        { description: { contains: query.query, mode: 'insensitive' } },
        {
          ingredients: {
            some: {
              food: { name: { contains: query.query, mode: 'insensitive' } },
            },
          },
        },
      ];
    }

    if (query.categoryId) {
      where.categories = {
        some: { recipeCategoryId: query.categoryId },
      };
    }

    if (query.mine) {
      where.createdById = userId;
    } else if (query.saved) {
      where.savedBy = { some: { userId } };
    } else {
      where.AND = [
        {
          OR: [{ isPublic: true }, { createdById: userId }],
        },
      ];
    }

    const sort = query.sort ?? 'random';
    const isRandom = sort === 'random' && !query.query;

    let formatted: ReturnType<typeof this.formatRecipeListItem>[];
    let total: number;

    if (isRandom) {
      const allIds = await this.db.recipe.findMany({
        where,
        select: { id: true },
      });
      total = allIds.length;

      const seed = query.seed ?? Math.random();
      const shuffled = this.seededShuffle(
        allIds.map((r) => r.id),
        seed,
      );
      const pageIds = shuffled.slice(skip, skip + limit);

      const items = await this.db.recipe.findMany({
        where: { id: { in: pageIds } },
        select: recipeListSelect,
      });

      const idOrder = new Map(pageIds.map((id, idx) => [id, idx]));
      items.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

      formatted = items.map((item) => this.formatRecipeListItem(item, userId));
    } else {
      const orderBy = query.query
        ? [{ name: 'asc' as const }, { updatedAt: 'desc' as const }]
        : sort === 'name'
          ? [{ name: 'asc' as const }]
          : sort === 'oldest'
            ? [{ createdAt: 'asc' as const }]
            : [{ createdAt: 'desc' as const }];

      const [items, count] = await Promise.all([
        this.db.recipe.findMany({
          where,
          skip,
          take: limit,
          select: recipeListSelect,
          orderBy,
        }),
        this.db.recipe.count({ where }),
      ]);
      total = count;

      formatted = items.map((item) => this.formatRecipeListItem(item, userId));

      if (query.query) {
        const q = query.query.toLowerCase();
        formatted.sort((a, b) => {
          return this.searchRelevance(b, q) - this.searchRelevance(a, q);
        });
      }
    }

    return {
      success: true,
      data: {
        items: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + formatted.length < total,
      },
    };
  }

  private seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let s = Math.abs(seed) || 0.5;
    for (let i = result.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private searchRelevance(recipe: RecipeListItem, query: string): number {
    const name = recipe.name.toLowerCase();
    let score = 0;

    // Exact name match (highest priority)
    if (name === query) score += 100;
    // Name starts with query
    else if (name.startsWith(query)) score += 80;
    // Name contains query as a whole word
    else if (
      new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(
        name,
      )
    )
      score += 60;
    // Name contains query (substring)
    else if (name.includes(query)) score += 40;

    // Description match (lower priority)
    const desc = (recipe.description ?? '').toLowerCase();
    if (desc.includes(query)) score += 10;

    return score;
  }

  async findOne(
    userId: string,
    recipeId: string,
  ): Promise<SuccessResponse<RecipeResponse> | ErrorResponse> {
    const recipe = await this.db.recipe.findFirst({
      where: {
        id: recipeId,
        OR: [{ isPublic: true }, { createdById: userId }],
      },
      select: recipeSelect,
    });

    if (!recipe) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Recipe not found',
        },
      };
    }

    return {
      success: true,
      data: this.formatRecipe(recipe, userId),
    };
  }

  async update(
    userId: string,
    recipeId: string,
    data: UpdateRecipe,
  ): Promise<SuccessResponse<RecipeResponse> | ErrorResponse> {
    const existing = await this.db.recipe.findFirst({
      where: { id: recipeId, createdById: userId },
      select: { id: true, totalServings: true },
    });

    if (!existing) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Recipe not found',
        },
      };
    }

    const effectiveServings = data.totalServings ?? existing.totalServings;

    let ingredientPatch:
      | {
          deleteMany: Record<string, never>;
          create: Array<{
            foodId: string;
            quantity: number;
            note: string | null;
            sortOrder: number;
            totalCalories: number;
            totalProtein: number;
            totalCarbs: number;
            totalFat: number;
          }>;
        }
      | undefined;

    let totals:
      | { calories: number; protein: number; carbs: number; fat: number }
      | undefined;

    if (data.ingredients) {
      const normalizedIngredients = data.ingredients.map(
        (ingredient, index) => ({
          ...ingredient,
          sortOrder: ingredient.sortOrder ?? index,
        }),
      );

      const foods = await this.db.food.findMany({
        where: {
          id: {
            in: normalizedIngredients.map((ingredient) => ingredient.foodId),
          },
          OR: [{ isPrivate: false }, { createdById: userId }],
        },
        select: {
          id: true,
          calories: true,
          protein: true,
          carbohydrates: true,
          fat: true,
        },
      });

      if (foods.length !== normalizedIngredients.length) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message:
              'One or more ingredients were not found or are not accessible',
          },
        };
      }

      const foodMap = new Map(foods.map((food) => [food.id, food]));
      const computedIngredients = normalizedIngredients.map((ingredient) => {
        const food = foodMap.get(ingredient.foodId)!;
        const multiplier = ingredient.quantity;
        return {
          foodId: ingredient.foodId,
          quantity: ingredient.quantity,
          note: ingredient.note ?? null,
          sortOrder: ingredient.sortOrder,
          totalCalories: this.roundToOne(food.calories * multiplier),
          totalProtein: this.roundToOne(food.protein * multiplier),
          totalCarbs: this.roundToOne(food.carbohydrates * multiplier),
          totalFat: this.roundToOne(food.fat * multiplier),
        };
      });

      totals = computedIngredients.reduce(
        (acc, ingredient) => ({
          calories: this.roundToOne(acc.calories + ingredient.totalCalories),
          protein: this.roundToOne(acc.protein + ingredient.totalProtein),
          carbs: this.roundToOne(acc.carbs + ingredient.totalCarbs),
          fat: this.roundToOne(acc.fat + ingredient.totalFat),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      ingredientPatch = {
        deleteMany: {},
        create: computedIngredients,
      };
    }

    const currentRecipe = await this.db.recipe.findUnique({
      where: { id: recipeId },
      select: {
        totalCalories: true,
        totalProtein: true,
        totalCarbs: true,
        totalFat: true,
      },
    });

    const appliedTotals = totals ?? {
      calories: currentRecipe?.totalCalories ?? 0,
      protein: currentRecipe?.totalProtein ?? 0,
      carbs: currentRecipe?.totalCarbs ?? 0,
      fat: currentRecipe?.totalFat ?? 0,
    };

    const perServing = {
      calories: this.roundToOne(appliedTotals.calories / effectiveServings),
      protein: this.roundToOne(appliedTotals.protein / effectiveServings),
      carbs: this.roundToOne(appliedTotals.carbs / effectiveServings),
      fat: this.roundToOne(appliedTotals.fat / effectiveServings),
    };

    const updated = await this.db.recipe.update({
      where: { id: recipeId },
      data: {
        name: data.name,
        description:
          data.description === undefined
            ? undefined
            : (data.description ?? null),
        imageUrl:
          data.imageUrl === undefined ? undefined : (data.imageUrl ?? null),
        directions: data.directions,
        totalServings: data.totalServings,
        isPublic: data.isPublic,
        totalCalories: appliedTotals.calories,
        totalProtein: appliedTotals.protein,
        totalCarbs: appliedTotals.carbs,
        totalFat: appliedTotals.fat,
        perServingCalories: perServing.calories,
        perServingProtein: perServing.protein,
        perServingCarbs: perServing.carbs,
        perServingFat: perServing.fat,
        ingredients: ingredientPatch,
        ...(data.categoryIds !== undefined && {
          categories: {
            deleteMany: {},
            ...(data.categoryIds.length > 0 && {
              create: data.categoryIds.map((id) => ({
                recipeCategoryId: id,
              })),
            }),
          },
        }),
      },
      select: recipeSelect,
    });

    return {
      success: true,
      data: this.formatRecipe(updated, userId),
    };
  }

  async remove(
    userId: string,
    recipeId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const existing = await this.db.recipe.findFirst({
      where: { id: recipeId, createdById: userId },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Recipe not found',
        },
      };
    }

    await this.db.recipe.delete({ where: { id: recipeId } });
    return { success: true, data: { deleted: true } };
  }

  async save(
    userId: string,
    recipeId: string,
  ): Promise<SuccessResponse<{ saved: true }> | ErrorResponse> {
    const recipe = await this.db.recipe.findFirst({
      where: {
        id: recipeId,
        isPublic: true,
      },
      select: { id: true },
    });

    if (!recipe) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Recipe not found or not public',
        },
      };
    }

    await this.db.userSavedRecipe.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      create: { userId, recipeId },
      update: {},
    });

    return { success: true, data: { saved: true } };
  }

  async unsave(
    userId: string,
    recipeId: string,
  ): Promise<SuccessResponse<{ deleted: true }>> {
    await this.db.userSavedRecipe.deleteMany({
      where: { userId, recipeId },
    });
    return { success: true, data: { deleted: true } };
  }

  async logToDiary(
    userId: string,
    recipeId: string,
    data: LogRecipe,
  ): Promise<
    SuccessResponse<{ id: string } | Record<string, never>> | ErrorResponse
  > {
    const recipe = await this.db.recipe.findFirst({
      where: {
        id: recipeId,
        OR: [{ isPublic: true }, { createdById: userId }],
      },
      select: {
        id: true,
        name: true,
        perServingCalories: true,
        perServingProtein: true,
        perServingCarbs: true,
        perServingFat: true,
      },
    });

    if (!recipe) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Recipe not found',
        },
      };
    }

    const servings = data.servings || 1;

    const created = await this.db.foodLog.create({
      data: {
        userId,
        recipeId: recipe.id,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
        mealType: data.mealType,
        servings,
        servingSize: servings,
        servingUnit: 'SERVING',
        quickAddName: recipe.name,
        totalCalories: this.roundToOne(recipe.perServingCalories * servings),
        totalProtein: this.roundToOne(recipe.perServingProtein * servings),
        totalCarbs: this.roundToOne(recipe.perServingCarbs * servings),
        totalFat: this.roundToOne(recipe.perServingFat * servings),
        note: data.note,
      },
      select: { id: true },
    });

    return {
      success: true,
      data: { id: created.id },
    };
  }

  // ==================== Admin Methods ====================

  async adminList(
    query: SearchRecipes,
  ): Promise<SuccessResponse<RecipeSearchResult>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.query) {
      where.OR = [
        { name: { contains: query.query, mode: 'insensitive' } },
        { description: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categories = {
        some: { recipeCategoryId: query.categoryId },
      };
    }

    if (query.verified !== undefined) {
      where.isVerified = query.verified;
    }

    const [items, total] = await Promise.all([
      this.db.recipe.findMany({
        where,
        skip,
        take: limit,
        select: recipeListSelect,
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.db.recipe.count({ where }),
    ]);

    // Admin list doesn't have a userId context — use empty string for isSaved
    return {
      success: true,
      data: {
        items: items.map((item) => this.formatRecipeListItem(item, '')),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + items.length < total,
      },
    };
  }

  async toggleVerify(
    recipeId: string,
  ): Promise<
    SuccessResponse<{ id: string; isVerified: boolean }> | ErrorResponse
  > {
    const recipe = await this.db.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true, isVerified: true },
    });

    if (!recipe) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recipe not found' },
      };
    }

    const updated = await this.db.recipe.update({
      where: { id: recipeId },
      data: { isVerified: !recipe.isVerified },
      select: { id: true, isVerified: true },
    });

    return {
      success: true,
      data: { id: updated.id, isVerified: updated.isVerified },
    };
  }

  private formatRecipe(
    recipe: {
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      directions: string[];
      totalServings: number;
      isPublic: boolean;
      isVerified: boolean;
      createdById: string;
      totalCalories: number;
      totalProtein: number;
      totalCarbs: number;
      totalFat: number;
      perServingCalories: number;
      perServingProtein: number;
      perServingCarbs: number;
      perServingFat: number;
      createdAt: Date;
      updatedAt: Date;
      ingredients: Array<{
        id: string;
        foodId: string;
        quantity: number;
        note: string | null;
        sortOrder: number;
        totalCalories: number;
        totalProtein: number;
        totalCarbs: number;
        totalFat: number;
        food: FoodListItem;
      }>;
      savedBy: Array<{ id: string; userId: string }>;
      categories: Array<{
        recipeCategory: RecipeCategoryResponse;
      }>;
    },
    userId: string,
  ): RecipeResponse {
    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      directions: recipe.directions,
      totalServings: recipe.totalServings,
      isPublic: recipe.isPublic,
      isVerified: recipe.isVerified,
      createdById: recipe.createdById,
      ingredientCount: recipe.ingredients.length,
      totals: {
        calories: this.roundToOne(recipe.totalCalories),
        protein: this.roundToOne(recipe.totalProtein),
        carbs: this.roundToOne(recipe.totalCarbs),
        fat: this.roundToOne(recipe.totalFat),
      },
      perServing: {
        calories: this.roundToOne(recipe.perServingCalories),
        protein: this.roundToOne(recipe.perServingProtein),
        carbs: this.roundToOne(recipe.perServingCarbs),
        fat: this.roundToOne(recipe.perServingFat),
      },
      isSaved: recipe.savedBy.some((saved) => saved.userId === userId),
      categories: recipe.categories.map((c) => c.recipeCategory),
      ingredients: recipe.ingredients.map((ingredient) => ({
        id: ingredient.id,
        foodId: ingredient.foodId,
        food: ingredient.food,
        quantity: ingredient.quantity,
        note: ingredient.note,
        sortOrder: ingredient.sortOrder,
        totalCalories: this.roundToOne(ingredient.totalCalories),
        totalProtein: this.roundToOne(ingredient.totalProtein),
        totalCarbs: this.roundToOne(ingredient.totalCarbs),
        totalFat: this.roundToOne(ingredient.totalFat),
      })),
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
    };
  }

  private formatRecipeListItem(
    recipe: {
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      totalServings: number;
      isPublic: boolean;
      isVerified: boolean;
      createdById: string;
      totalCalories: number;
      totalProtein: number;
      totalCarbs: number;
      totalFat: number;
      perServingCalories: number;
      perServingProtein: number;
      perServingCarbs: number;
      perServingFat: number;
      createdAt: Date;
      updatedAt: Date;
      ingredients: Array<{ id: string }>;
      savedBy: Array<{ id: string; userId: string }>;
      categories: Array<{
        recipeCategory: RecipeCategoryResponse;
      }>;
    },
    userId: string,
  ): RecipeListItem {
    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      totalServings: recipe.totalServings,
      isPublic: recipe.isPublic,
      isVerified: recipe.isVerified,
      createdById: recipe.createdById,
      ingredientCount: recipe.ingredients.length,
      totals: {
        calories: this.roundToOne(recipe.totalCalories),
        protein: this.roundToOne(recipe.totalProtein),
        carbs: this.roundToOne(recipe.totalCarbs),
        fat: this.roundToOne(recipe.totalFat),
      },
      perServing: {
        calories: this.roundToOne(recipe.perServingCalories),
        protein: this.roundToOne(recipe.perServingProtein),
        carbs: this.roundToOne(recipe.perServingCarbs),
        fat: this.roundToOne(recipe.perServingFat),
      },
      isSaved: recipe.savedBy.some((saved) => saved.userId === userId),
      categories: recipe.categories.map((c) => c.recipeCategory),
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
    };
  }

  private roundToOne(value: number): number {
    return Math.round((value + Number.EPSILON) * 10) / 10;
  }
}

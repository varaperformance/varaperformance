import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  groceryListSelect,
  groceryListSummarySelect,
} from '../selectors/grocery-list.selector';
import type {
  CreateGroceryList,
  UpdateGroceryList,
  CreateGroceryListItem,
  UpdateGroceryListItem,
  BatchCheckItems,
  SeedFromMealPlan,
  SeedFromRecipe,
} from '@varaperformance/core';
import type {
  GroceryListDetailResponse,
  GroceryListItemResponse,
  GroceryListSummary,
  SuccessResponse,
} from '@varaperformance/core';

@Injectable()
export class GroceryListsService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== LISTS ====================

  async create(
    userId: string,
    data: CreateGroceryList,
  ): Promise<SuccessResponse<GroceryListDetailResponse>> {
    const list = await this.db.groceryList.create({
      data: { userId, name: data.name, mealPlanId: data.mealPlanId },
      select: groceryListSelect,
    });

    return { success: true, data: this.formatDetailResponse(list) };
  }

  async findAll(
    userId: string,
  ): Promise<SuccessResponse<GroceryListSummary[]>> {
    const lists = await this.db.groceryList.findMany({
      where: { userId },
      select: groceryListSummarySelect,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    return {
      success: true,
      data: lists.map((l) => ({
        id: l.id,
        name: l.name,
        status: l.status,
        mealPlanName: l.mealPlan?.name ?? null,
        checkedCount: l.items.filter((i) => i.isChecked).length,
        totalCount: l._count.items,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
    };
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<SuccessResponse<GroceryListDetailResponse>> {
    const list = await this.db.groceryList.findFirst({
      where: { id, userId },
      select: groceryListSelect,
    });

    if (!list) throw new NotFoundException('Grocery list not found');
    return { success: true, data: this.formatDetailResponse(list) };
  }

  async update(
    userId: string,
    id: string,
    data: UpdateGroceryList,
  ): Promise<SuccessResponse<GroceryListDetailResponse>> {
    const existing = await this.db.groceryList.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Grocery list not found');

    const list = await this.db.groceryList.update({
      where: { id },
      data,
      select: groceryListSelect,
    });

    return { success: true, data: this.formatDetailResponse(list) };
  }

  async delete(
    userId: string,
    id: string,
  ): Promise<SuccessResponse<{ message: string }>> {
    const existing = await this.db.groceryList.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Grocery list not found');

    await this.db.groceryList.delete({ where: { id } });
    return { success: true, data: { message: 'Grocery list deleted' } };
  }

  // ==================== ITEMS ====================

  async addItem(
    userId: string,
    listId: string,
    data: CreateGroceryListItem,
  ): Promise<SuccessResponse<GroceryListItemResponse>> {
    const list = await this.db.groceryList.findFirst({
      where: { id: listId, userId },
      select: { id: true },
    });
    if (!list) throw new NotFoundException('Grocery list not found');

    const item = await this.db.groceryListItem.create({
      data: {
        groceryListId: listId,
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category ?? 'General',
        foodId: data.foodId,
        note: data.note,
        sortOrder: data.sortOrder ?? 0,
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        category: true,
        isChecked: true,
        sortOrder: true,
        note: true,
        foodId: true,
      },
    });

    return { success: true, data: item };
  }

  async updateItem(
    userId: string,
    listId: string,
    itemId: string,
    data: UpdateGroceryListItem,
  ): Promise<SuccessResponse<GroceryListItemResponse>> {
    const list = await this.db.groceryList.findFirst({
      where: { id: listId, userId },
      select: { id: true },
    });
    if (!list) throw new NotFoundException('Grocery list not found');

    const existing = await this.db.groceryListItem.findFirst({
      where: { id: itemId, groceryListId: listId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Grocery list item not found');

    const item = await this.db.groceryListItem.update({
      where: { id: itemId },
      data,
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        category: true,
        isChecked: true,
        sortOrder: true,
        note: true,
        foodId: true,
      },
    });

    return { success: true, data: item };
  }

  async removeItem(
    userId: string,
    listId: string,
    itemId: string,
  ): Promise<SuccessResponse<{ message: string }>> {
    const list = await this.db.groceryList.findFirst({
      where: { id: listId, userId },
      select: { id: true },
    });
    if (!list) throw new NotFoundException('Grocery list not found');

    const existing = await this.db.groceryListItem.findFirst({
      where: { id: itemId, groceryListId: listId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Grocery list item not found');

    await this.db.groceryListItem.delete({ where: { id: itemId } });
    return { success: true, data: { message: 'Item removed' } };
  }

  // ==================== BATCH ====================

  async batchCheckItems(
    userId: string,
    listId: string,
    data: BatchCheckItems,
  ): Promise<SuccessResponse<{ updated: number }>> {
    const list = await this.db.groceryList.findFirst({
      where: { id: listId, userId },
      select: { id: true },
    });
    if (!list) throw new NotFoundException('Grocery list not found');

    const result = await this.db.groceryListItem.updateMany({
      where: {
        id: { in: data.itemIds },
        groceryListId: listId,
      },
      data: { isChecked: data.isChecked },
    });

    return { success: true, data: { updated: result.count } };
  }

  // ==================== SEED FROM MEAL PLAN ====================

  async seedFromMealPlan(
    userId: string,
    data: SeedFromMealPlan,
  ): Promise<SuccessResponse<GroceryListDetailResponse>> {
    const plan = await this.db.mealPlan.findFirst({
      where: { id: data.mealPlanId, userId },
      select: {
        name: true,
        items: {
          select: {
            dayOfWeek: true,
            servings: true,
            food: {
              select: {
                id: true,
                name: true,
                brand: true,
                servingUnit: true,
              },
            },
            recipe: {
              select: {
                id: true,
                name: true,
                ingredients: {
                  select: {
                    food: {
                      select: {
                        id: true,
                        name: true,
                        brand: true,
                        servingUnit: true,
                      },
                    },
                    quantity: true,
                  },
                },
              },
            },
            customName: true,
          },
        },
      },
    });

    if (!plan) throw new NotFoundException('Meal plan not found');

    const days = data.days ?? [0, 1, 2, 3, 4, 5, 6];
    const multiplier = data.servingsMultiplier ?? 1;
    const filteredItems = plan.items.filter((i) => days.includes(i.dayOfWeek));

    if (filteredItems.length === 0) {
      throw new BadRequestException(
        'No items found for the selected days in this meal plan',
      );
    }

    // Aggregate foods
    const foodMap = new Map<
      string,
      {
        name: string;
        foodId: string | null;
        servings: number;
        unit: string | null;
      }
    >();

    for (const item of filteredItems) {
      if (item.food) {
        const key = item.food.id;
        const existing = foodMap.get(key);
        const qty = item.servings * multiplier;
        if (existing) {
          existing.servings += qty;
        } else {
          foodMap.set(key, {
            name: item.food.brand
              ? `${item.food.name} (${item.food.brand})`
              : item.food.name,
            foodId: item.food.id,
            servings: qty,
            unit: item.food.servingUnit,
          });
        }
      }

      if (item.recipe?.ingredients) {
        for (const ing of item.recipe.ingredients) {
          const key = ing.food.id;
          const existing = foodMap.get(key);
          const qty = ing.quantity * item.servings * multiplier;
          if (existing) {
            existing.servings += qty;
          } else {
            foodMap.set(key, {
              name: ing.food.brand
                ? `${ing.food.name} (${ing.food.brand})`
                : ing.food.name,
              foodId: ing.food.id,
              servings: qty,
              unit: ing.food.servingUnit,
            });
          }
        }
      }

      if (item.customName && !item.food && !item.recipe) {
        const key = `custom:${item.customName}`;
        const existing = foodMap.get(key);
        const qty = item.servings * multiplier;
        if (existing) {
          existing.servings += qty;
        } else {
          foodMap.set(key, {
            name: item.customName,
            foodId: null,
            servings: qty,
            unit: null,
          });
        }
      }
    }

    const listName = data.name ?? `${plan.name} — Grocery List`;
    const sortedItems = Array.from(foodMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const list = await this.db.groceryList.create({
      data: {
        userId,
        name: listName,
        mealPlanId: data.mealPlanId,
        items: {
          create: sortedItems.map((val, idx) => ({
            name: val.name,
            quantity: Math.round(val.servings * 10) / 10,
            unit: val.unit?.toLowerCase() ?? 'servings',
            foodId: val.foodId,
            sortOrder: idx,
            category: 'General',
          })),
        },
      },
      select: groceryListSelect,
    });

    return { success: true, data: this.formatDetailResponse(list) };
  }

  // ==================== SEED FROM RECIPE ====================

  async seedFromRecipe(
    userId: string,
    data: SeedFromRecipe,
  ): Promise<SuccessResponse<GroceryListDetailResponse>> {
    const recipe = await this.db.recipe.findFirst({
      where: {
        id: data.recipeId,
        OR: [{ isPublic: true }, { createdById: userId }],
      },
      select: {
        name: true,
        totalServings: true,
        ingredients: {
          select: {
            quantity: true,
            note: true,
            food: {
              select: {
                id: true,
                name: true,
                brand: true,
                servingUnit: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) throw new NotFoundException('Recipe not found');

    if (recipe.ingredients.length === 0) {
      throw new BadRequestException('Recipe has no ingredients');
    }

    const multiplier = data.servingsMultiplier ?? 1;

    const foodMap = new Map<
      string,
      {
        name: string;
        foodId: string;
        servings: number;
        unit: string | null;
        note: string | null;
      }
    >();

    for (const ing of recipe.ingredients) {
      const key = ing.food.id;
      const qty = ing.quantity * multiplier;
      const existing = foodMap.get(key);

      if (existing) {
        existing.servings += qty;
      } else {
        foodMap.set(key, {
          name: ing.food.brand
            ? `${ing.food.name} (${ing.food.brand})`
            : ing.food.name,
          foodId: ing.food.id,
          servings: qty,
          unit: ing.food.servingUnit,
          note: ing.note,
        });
      }
    }

    const listName = data.name ?? `${recipe.name} — Grocery List`;
    const sortedItems = Array.from(foodMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const list = await this.db.groceryList.create({
      data: {
        userId,
        name: listName,
        items: {
          create: sortedItems.map((val, idx) => ({
            name: val.name,
            quantity: Math.round(val.servings * 10) / 10,
            unit: val.unit?.toLowerCase() ?? 'servings',
            foodId: val.foodId,
            sortOrder: idx,
            note: val.note,
            category: 'General',
          })),
        },
      },
      select: groceryListSelect,
    });

    return { success: true, data: this.formatDetailResponse(list) };
  }

  // ==================== HELPERS ====================

  private formatDetailResponse(list: {
    id: string;
    name: string;
    status: string;
    mealPlanId: string | null;
    mealPlan: { name: string } | null;
    items: {
      id: string;
      name: string;
      quantity: number | null;
      unit: string | null;
      category: string;
      isChecked: boolean;
      sortOrder: number;
      note: string | null;
      foodId: string | null;
    }[];
    createdAt: Date;
    updatedAt: Date;
  }): GroceryListDetailResponse {
    return {
      id: list.id,
      name: list.name,
      status: list.status,
      mealPlanId: list.mealPlanId,
      mealPlanName: list.mealPlan?.name ?? null,
      items: list.items,
      checkedCount: list.items.filter((i) => i.isChecked).length,
      totalCount: list.items.length,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    };
  }
}

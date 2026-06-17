import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { FoodSearchService } from '@app/common/food-search';
import { USDAService, type NormalizedFood } from './usda.service';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { foodSelect, foodListSelect } from '../selectors/nutrition.selector';
import type {
  CreateFood,
  UpdateFood,
  SearchFoods,
  ServingUnit,
  FoodSource,
} from '@varaperformance/core';
import type {
  FoodResponse,
  FoodListItem,
  FoodSearchResult,
  SuccessResponse,
} from '@varaperformance/core';

@Injectable()
export class FoodService {
  constructor(
    private readonly db: DatabaseService,
    private readonly foodSearch: FoodSearchService,
    private readonly usda: USDAService,
    private readonly openFoodFacts: OpenFoodFactsService,
  ) {}

  /**
   * Search foods - local DB first, then external APIs if needed
   */
  async search(
    query: SearchFoods,
    userId: string,
  ): Promise<SuccessResponse<FoodSearchResult>> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const sourcesSearched: ('LOCAL' | 'USDA' | 'OPENFOOD')[] = ['LOCAL'];

    // Build where clause - exclude private foods from other users
    const where: Record<string, unknown> = {
      isActive: true,
      OR: [{ isPrivate: false }, { isPrivate: true, createdById: userId }],
    };

    if (query.query) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.query, mode: 'insensitive' } },
            { brand: { contains: query.query, mode: 'insensitive' } },
          ],
        },
      ];
    }
    if (query.brand) {
      where.brand = { contains: query.brand, mode: 'insensitive' };
    }
    if (query.source) {
      where.source = query.source;
    }
    if (query.barcode) {
      where.barcode = query.barcode;
    }

    if (query.query) {
      // Use shared search service: ILIKE pre-filter → pg_trgm re-rank
      const { ids: rankedIds, total } = await this.foodSearch.searchFoodIds(
        query.query,
        { userId, limit, skip, source: query.source, brand: query.brand },
      );

      if (rankedIds.length >= limit) {
        const items = await this.fetchFoodsByIds(rankedIds);
        return {
          success: true,
          data: {
            items,
            total,
            page,
            limit,
            hasMore: skip + items.length < total,
            sourcesSearched,
          },
        };
      }

      // If few local results, search external APIs
      const localItems = await this.fetchFoodsByIds(rankedIds);
      const externalResults = await this.searchExternal(
        query.query,
        limit - localItems.length,
      );
      sourcesSearched.push('USDA', 'OPENFOOD');

      // Save new external foods to DB
      const newFoods = await this.saveExternalFoods(externalResults);

      // Re-rank combined local + new external IDs
      const allIds = [
        ...rankedIds,
        ...newFoods.map((f) => (f as { id: string }).id),
      ];
      const finalIds = await this.foodSearch.rankFoodIds(
        query.query,
        allIds,
        limit,
      );
      const items = await this.fetchFoodsByIds(finalIds);

      return {
        success: true,
        data: {
          items,
          total: total + newFoods.length,
          page,
          limit,
          hasMore: false,
          sourcesSearched,
        },
      };
    }

    // No search query - return local results as-is
    const [items, total] = await Promise.all([
      this.db.food.findMany({
        where,
        select: foodListSelect,
        skip,
        take: limit,
        orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      }),
      this.db.food.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items as unknown as FoodListItem[],
        total,
        page,
        limit,
        hasMore: skip + items.length < total,
        sourcesSearched,
      },
    };
  }

  /**
   * Admin search - includes private foods and allows verification filtering
   */
  async searchAdmin(
    query: SearchFoods,
    verified?: boolean,
  ): Promise<SuccessResponse<FoodSearchResult>> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (query.query) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.query, mode: 'insensitive' } },
            { brand: { contains: query.query, mode: 'insensitive' } },
          ],
        },
      ];
    }
    if (query.brand) {
      where.brand = { contains: query.brand, mode: 'insensitive' };
    }
    if (query.source) {
      where.source = query.source;
    }
    if (query.barcode) {
      where.barcode = query.barcode;
    }
    if (verified !== undefined) {
      where.isVerified = verified;
    }

    if (query.query) {
      // Overfetch candidate IDs, then pg_trgm re-rank
      const overfetch = Math.max(limit * 3, 60);
      const [candidates, total] = await Promise.all([
        this.db.food.findMany({
          where,
          select: { id: true },
          take: overfetch,
          orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
        }),
        this.db.food.count({ where }),
      ]);

      const rankedIds = await this.foodSearch.rankFoodIds(
        query.query,
        candidates.map((c) => c.id),
        overfetch,
      );

      const pagedIds = rankedIds.slice(skip, skip + limit);
      const items = await this.fetchFoodsByIds(pagedIds);

      return {
        success: true,
        data: {
          items,
          total,
          page,
          limit,
          hasMore: skip + items.length < total,
          sourcesSearched: ['LOCAL'],
        },
      };
    }

    const [items, total] = await Promise.all([
      this.db.food.findMany({
        where,
        select: foodListSelect,
        skip,
        take: limit,
        orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      }),
      this.db.food.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items as unknown as FoodListItem[],
        total,
        page,
        limit,
        hasMore: skip + items.length < total,
        sourcesSearched: ['LOCAL'],
      },
    };
  }

  /**
   * Search by barcode - check DB first, then external APIs
   */
  async searchByBarcode(
    barcode: string,
    userId: string,
  ): Promise<SuccessResponse<FoodListItem | null>> {
    // Check local DB first - only return if accessible to user
    const local = await this.db.food.findFirst({
      where: {
        barcode,
        OR: [{ isPrivate: false }, { isPrivate: true, createdById: userId }],
      },
      select: foodListSelect,
    });

    if (local) {
      return { success: true, data: local as unknown as FoodListItem };
    }

    // Check if barcode exists but is private (owned by another user)
    const privateFood = await this.db.food.findUnique({
      where: { barcode },
      select: { id: true },
    });

    // If it exists but wasn't returned, it's private - don't fetch from external
    if (privateFood) {
      return { success: true, data: null };
    }

    // Try USDA
    const usdaResult = await this.usda.searchByBarcode(barcode);
    if (usdaResult) {
      const created = await this.saveExternalFood(usdaResult);
      if (created) return { success: true, data: created };
    }

    // Try Open Food Facts
    const offResult = await this.openFoodFacts.getByBarcode(barcode);
    if (offResult) {
      const created = await this.saveExternalFood(offResult);
      if (created) return { success: true, data: created };
    }

    return { success: true, data: null };
  }

  /**
   * Get food by ID
   */
  async getById(id: string): Promise<SuccessResponse<FoodResponse>> {
    const food = await this.db.food.findUnique({
      where: { id },
      select: foodSelect,
    });

    if (!food) {
      throw new NotFoundException('Food not found');
    }

    return {
      success: true,
      data: this.formatFoodResponse(food),
    };
  }

  /**
   * Create custom food (user-created)
   */
  async create(
    userId: string,
    data: CreateFood,
    isAdmin = false,
  ): Promise<SuccessResponse<FoodResponse>> {
    const { source, ...restData } = data;

    const food = await this.db.food.create({
      data: {
        ...restData,
        source: (isAdmin ? source : undefined) ?? 'USER',
        isVerified: false,
        createdById: userId,
      },
      select: foodSelect,
    });

    return {
      success: true,
      data: this.formatFoodResponse(food),
    };
  }

  /**
   * Update custom food (only owner or admin)
   */
  async update(
    id: string,
    userId: string,
    data: UpdateFood,
    isAdmin = false,
  ): Promise<SuccessResponse<FoodResponse>> {
    const food = await this.db.food.findUnique({
      where: { id },
      select: {
        createdById: true,
        source: true,
        isVerified: true,
        isPrivate: true,
      },
    });

    if (!food) {
      throw new NotFoundException('Food not found');
    }

    // Permission check:
    // - Admins can update any food
    // - Verified foods can only be updated by admins
    // - Private foods can only be updated by owner
    // - All other foods can be updated by any authenticated user
    const isOwner = food.createdById === userId;

    if (!isAdmin) {
      if (food.isVerified) {
        throw new NotFoundException('Verified foods cannot be edited');
      }
      if (food.isPrivate && !isOwner) {
        throw new NotFoundException('Food not found');
      }
    }

    const updateData: UpdateFood = { ...data };
    if (!isAdmin) {
      delete (updateData as UpdateFood & { source?: FoodSource }).source;
    }

    const updated = await this.db.food.update({
      where: { id },
      data: updateData,
      select: foodSelect,
    });

    return {
      success: true,
      data: this.formatFoodResponse(updated),
    };
  }

  /**
   * Verify food (admin only)
   */
  async verify(
    id: string,
    verified = true,
  ): Promise<SuccessResponse<{ message: string }>> {
    await this.db.food.update({
      where: { id },
      data: { isVerified: verified },
    });

    return {
      success: true,
      data: {
        message: verified
          ? 'Food verified successfully'
          : 'Food verification removed',
      },
    };
  }

  /**
   * Delete custom food (soft delete)
   */
  async delete(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<SuccessResponse<{ message: string }>> {
    const food = await this.db.food.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!food) {
      throw new NotFoundException('Food not found');
    }

    if (!isAdmin && food.createdById !== userId) {
      throw new NotFoundException('Food not found');
    }

    await this.db.food.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      success: true,
      data: { message: 'Food deleted successfully' },
    };
  }

  // ==================== Private Helpers ====================

  private async searchExternal(
    query: string,
    limit: number,
  ): Promise<NormalizedFood[]> {
    // Search both APIs in parallel
    const [usdaResults, offResults] = await Promise.all([
      this.usda.search(query, Math.ceil(limit / 2)),
      this.openFoodFacts.search(query, Math.ceil(limit / 2)),
    ]);

    // Combine and dedupe by barcode/name
    const seen = new Set<string>();
    const combined: NormalizedFood[] = [];

    for (const food of [...usdaResults, ...offResults]) {
      const key = food.barcode || `${food.name}-${food.brand}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(food);
      }
    }

    return combined.slice(0, limit);
  }

  private getFoodIdentityKey(
    name: string,
    brand: string | null | undefined,
    barcode: string | null | undefined,
  ): string {
    if (barcode) {
      return `barcode:${barcode}`;
    }

    const normalizedName = name.trim().toLowerCase();
    const normalizedBrand = (brand ?? '').trim().toLowerCase();
    return `name-brand:${normalizedName}|${normalizedBrand}`;
  }

  private toFoodIdentityPredicate(food: {
    name: string;
    brand?: string | null;
    barcode?: string | null;
  }): { barcode: string } | { name: string; brand: string | null } | null {
    if (food.barcode) {
      return { barcode: food.barcode };
    }

    if (!food.name) {
      return null;
    }

    return {
      name: food.name,
      brand: food.brand ?? null,
    };
  }

  private async saveExternalFood(
    food: NormalizedFood,
  ): Promise<FoodListItem | null> {
    if (!this.hasValidMacros(food)) return null;

    const created = await this.db.food.create({
      data: {
        name: food.name,
        brand: food.brand,
        barcode: food.barcode,
        source: food.source,
        isVerified: false,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit as ServingUnit,
        servingLabel: food.servingLabel,
        calories: food.calories,
        protein: food.protein,
        carbohydrates: food.carbohydrates,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar,
        saturatedFat: food.saturatedFat,
        cholesterol: food.cholesterol,
        sodium: food.sodium,
      },
      select: foodListSelect,
    });

    return created as unknown as FoodListItem;
  }

  /**
   * Fetch full FoodListItem records for a list of IDs, preserving the input order.
   */
  private async fetchFoodsByIds(ids: string[]): Promise<FoodListItem[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.food.findMany({
      where: { id: { in: ids } },
      select: foodListSelect,
    });
    const map = new Map(
      rows.map((r) => [(r as unknown as FoodListItem).id, r]),
    );
    return ids
      .map((id) => map.get(id))
      .filter(Boolean) as unknown as FoodListItem[];
  }

  /**
   * De-dup, validate, insert external foods and return the newly created records.
   */
  private async saveExternalFoods(
    externalResults: NormalizedFood[],
  ): Promise<unknown[]> {
    const identityPredicates = externalResults
      .map((food) => this.toFoodIdentityPredicate(food))
      .filter((predicate) => predicate !== null);

    const existingFoods =
      identityPredicates.length > 0
        ? await this.db.food.findMany({
            where: { OR: identityPredicates },
            select: { name: true, brand: true, barcode: true },
          })
        : [];

    const existingKeys = new Set(
      existingFoods.map((food) =>
        this.getFoodIdentityKey(food.name, food.brand, food.barcode),
      ),
    );

    const foodsToInsert = externalResults.filter(
      (food) =>
        !existingKeys.has(
          this.getFoodIdentityKey(food.name, food.brand, food.barcode),
        ) && this.hasValidMacros(food),
    );

    if (foodsToInsert.length > 0) {
      await this.db.food.createMany({
        data: foodsToInsert.map((food) => ({
          name: food.name,
          brand: food.brand,
          barcode: food.barcode,
          source: food.source,
          isVerified: false,
          servingSize: food.servingSize,
          servingUnit: food.servingUnit as ServingUnit,
          servingLabel: food.servingLabel,
          calories: food.calories,
          protein: food.protein,
          carbohydrates: food.carbohydrates,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          saturatedFat: food.saturatedFat,
          cholesterol: food.cholesterol,
          sodium: food.sodium,
        })),
        skipDuplicates: true,
      });
    }

    return foodsToInsert.length > 0
      ? await this.db.food.findMany({
          where: {
            OR: foodsToInsert
              .map((food) => this.toFoodIdentityPredicate(food))
              .filter((predicate) => predicate !== null),
          },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: foodsToInsert.length,
        })
      : [];
  }

  /**
   * Atwater sanity check: reject foods where calories and all macros are zero,
   * or where the calorie/macro ratio is wildly off.
   */
  private hasValidMacros(food: NormalizedFood): boolean {
    const { calories, protein, carbohydrates, fat } = food;
    const computed = 4 * protein + 4 * carbohydrates + 9 * fat;

    // Both zero → no nutritional data at all
    if (computed < 1 && calories < 1) return false;

    // Has macros but zero calories → allow (we could compute, but still useful)
    if (calories < 1 && computed >= 5) return true;

    // Negligible macros → trust the label calories
    if (computed < 5) return true;

    // Ratio check: reject if way off
    const ratio = calories / computed;
    return ratio >= 0.4 && ratio <= 2.5;
  }

  private formatFoodResponse(food: Record<string, unknown>): FoodResponse {
    return {
      ...food,
      createdAt: (food.createdAt as Date).toISOString(),
    } as unknown as FoodResponse;
  }
}

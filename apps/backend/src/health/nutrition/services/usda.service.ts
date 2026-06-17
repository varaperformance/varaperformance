import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * USDA FoodData Central API Service
 * https://fdc.nal.usda.gov/api-guide.html
 *
 * Free API - no key required for basic searches, but key recommended for production
 */

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

interface USDAFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  unitName: string;
  value: number;
}

interface USDASearchFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  dataType: string;
  foodNutrients: USDAFoodNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
}

interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDASearchFood[];
}

interface USDAFoodDetail {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  dataType: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  labelNutrients?: {
    calories?: { value: number };
    protein?: { value: number };
    fat?: { value: number };
    carbohydrates?: { value: number };
    fiber?: { value: number };
    sugars?: { value: number };
    sodium?: { value: number };
    saturatedFat?: { value: number };
    cholesterol?: { value: number };
  };
}

export interface NormalizedFood {
  name: string;
  brand: string | null;
  barcode: string | null;
  servingSize: number;
  servingUnit: string;
  servingLabel: string | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  saturatedFat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  source: 'USDA' | 'OPENFOOD';
  externalId: string;
}

// USDA nutrient IDs
const USDA_NUTRIENT_IDS = {
  ENERGY: 1008, // kcal
  PROTEIN: 1003, // g
  FAT: 1004, // g
  CARBS: 1005, // g
  FIBER: 1079, // g
  SUGAR: 2000, // g (total sugars)
  SODIUM: 1093, // mg
  SATURATED_FAT: 1258, // g
  CHOLESTEROL: 1253, // mg
  POTASSIUM: 1092, // mg
  CALCIUM: 1087, // mg
  IRON: 1089, // mg
  VITAMIN_A: 1106, // IU
  VITAMIN_C: 1162, // mg
};

@Injectable()
export class USDAService {
  private readonly logger = new Logger(USDAService.name);
  private readonly baseUrl = 'https://api.nal.usda.gov/fdc/v1';
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('USDA_API_KEY') || 'DEMO_KEY';
  }

  /**
   * Search USDA database for foods
   */
  async search(query: string, limit = 10): Promise<NormalizedFood[]> {
    try {
      const url = `${this.baseUrl}/foods/search?api_key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          query,
          pageSize: limit,
          dataType: ['Branded', 'Foundation', 'SR Legacy'],
        }),
      });

      if (!response.ok) {
        this.logger.warn(`USDA search failed: ${response.status}`);
        return [];
      }

      const data: USDASearchResponse = await response.json();
      return data.foods.map((food) => this.normalizeFood(food));
    } catch (error) {
      this.logger.error('USDA search error', error);
      return [];
    }
  }

  /**
   * Search by barcode (UPC)
   */
  async searchByBarcode(barcode: string): Promise<NormalizedFood | null> {
    try {
      const url = `${this.baseUrl}/foods/search?api_key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          query: barcode,
          pageSize: 1,
          dataType: ['Branded'],
        }),
      });

      if (!response.ok) return null;

      const data: USDASearchResponse = await response.json();
      const food = data.foods.find((f) => f.gtinUpc === barcode);
      return food ? this.normalizeFood(food) : null;
    } catch (error) {
      this.logger.error('USDA barcode search error', error);
      return null;
    }
  }

  /**
   * Get food details by USDA FDC ID
   */
  async getFood(fdcId: string): Promise<NormalizedFood | null> {
    try {
      const url = `${this.baseUrl}/food/${fdcId}?api_key=${this.apiKey}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;

      const data: USDAFoodDetail = await response.json();
      return this.normalizeFoodDetail(data);
    } catch (error) {
      this.logger.error('USDA get food error', error);
      return null;
    }
  }

  private normalizeFood(food: USDASearchFood): NormalizedFood {
    const getNutrient = (id: number): number => {
      const nutrient = food.foodNutrients.find((n) => n.nutrientId === id);
      return nutrient?.value ?? 0;
    };

    return {
      name: food.description,
      brand: food.brandOwner || food.brandName || null,
      barcode: food.gtinUpc || null,
      servingSize: food.servingSize || 100,
      servingUnit: this.mapServingUnit(food.servingSizeUnit),
      servingLabel: food.householdServingFullText || null,
      calories: Math.round(getNutrient(USDA_NUTRIENT_IDS.ENERGY)),
      protein: Math.round(getNutrient(USDA_NUTRIENT_IDS.PROTEIN) * 10) / 10,
      carbohydrates: Math.round(getNutrient(USDA_NUTRIENT_IDS.CARBS) * 10) / 10,
      fat: Math.round(getNutrient(USDA_NUTRIENT_IDS.FAT) * 10) / 10,
      fiber: getNutrient(USDA_NUTRIENT_IDS.FIBER) || null,
      sugar: getNutrient(USDA_NUTRIENT_IDS.SUGAR) || null,
      saturatedFat: getNutrient(USDA_NUTRIENT_IDS.SATURATED_FAT) || null,
      cholesterol: getNutrient(USDA_NUTRIENT_IDS.CHOLESTEROL) || null,
      sodium: getNutrient(USDA_NUTRIENT_IDS.SODIUM) || null,
      source: 'USDA',
      externalId: String(food.fdcId),
    };
  }

  private normalizeFoodDetail(food: USDAFoodDetail): NormalizedFood {
    // Try label nutrients first (more accurate for branded foods)
    if (food.labelNutrients) {
      return {
        name: food.description,
        brand: food.brandOwner || food.brandName || null,
        barcode: food.gtinUpc || null,
        servingSize: food.servingSize || 100,
        servingUnit: this.mapServingUnit(food.servingSizeUnit),
        servingLabel: food.householdServingFullText || null,
        calories: Math.round(food.labelNutrients.calories?.value ?? 0),
        protein:
          Math.round((food.labelNutrients.protein?.value ?? 0) * 10) / 10,
        carbohydrates:
          Math.round((food.labelNutrients.carbohydrates?.value ?? 0) * 10) / 10,
        fat: Math.round((food.labelNutrients.fat?.value ?? 0) * 10) / 10,
        fiber: food.labelNutrients.fiber?.value || null,
        sugar: food.labelNutrients.sugars?.value || null,
        saturatedFat: food.labelNutrients.saturatedFat?.value || null,
        cholesterol: food.labelNutrients.cholesterol?.value || null,
        sodium: food.labelNutrients.sodium?.value || null,
        source: 'USDA',
        externalId: String(food.fdcId),
      };
    }

    // Fall back to nutrient array
    const getNutrient = (id: number): number => {
      const nutrient = food.foodNutrients.find((n) => n.nutrientId === id);
      return nutrient?.value ?? 0;
    };

    return {
      name: food.description,
      brand: food.brandOwner || food.brandName || null,
      barcode: food.gtinUpc || null,
      servingSize: food.servingSize || 100,
      servingUnit: this.mapServingUnit(food.servingSizeUnit),
      servingLabel: food.householdServingFullText || null,
      calories: Math.round(getNutrient(USDA_NUTRIENT_IDS.ENERGY)),
      protein: Math.round(getNutrient(USDA_NUTRIENT_IDS.PROTEIN) * 10) / 10,
      carbohydrates: Math.round(getNutrient(USDA_NUTRIENT_IDS.CARBS) * 10) / 10,
      fat: Math.round(getNutrient(USDA_NUTRIENT_IDS.FAT) * 10) / 10,
      fiber: getNutrient(USDA_NUTRIENT_IDS.FIBER) || null,
      sugar: getNutrient(USDA_NUTRIENT_IDS.SUGAR) || null,
      saturatedFat: getNutrient(USDA_NUTRIENT_IDS.SATURATED_FAT) || null,
      cholesterol: getNutrient(USDA_NUTRIENT_IDS.CHOLESTEROL) || null,
      sodium: getNutrient(USDA_NUTRIENT_IDS.SODIUM) || null,
      source: 'USDA',
      externalId: String(food.fdcId),
    };
  }

  private mapServingUnit(unit?: string): string {
    if (!unit) return 'G';
    const u = unit.toUpperCase().trim();
    if (u === 'G' || u === 'GRAM' || u === 'GRAMS') return 'G';
    if (u === 'ML' || u === 'MILLILITER' || u === 'MILLILITERS') return 'ML';
    if (u === 'OZ' || u === 'OUNCE' || u === 'OUNCES') return 'OZ';
    if (u === 'CUP' || u === 'CUPS') return 'CUP';
    if (u === 'TBSP' || u === 'TABLESPOON' || u === 'TABLESPOONS')
      return 'TBSP';
    if (u === 'TSP' || u === 'TEASPOON' || u === 'TEASPOONS') return 'TSP';
    if (u === 'SLICE' || u === 'SLICES') return 'SLICE';
    if (u === 'PIECE' || u === 'PIECES' || u === 'EACH') return 'PIECE';
    if (u === 'SERVING' || u === 'SERVINGS') return 'SERVING';
    if (u === 'SCOOP' || u === 'SCOOPS') return 'SCOOP';
    return 'G';
  }
}

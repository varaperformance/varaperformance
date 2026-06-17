import { Injectable, Logger } from '@nestjs/common';
import type { NormalizedFood } from './usda.service';

/**
 * Open Food Facts API Service
 * https://world.openfoodfacts.org/data
 *
 * Free, open-source food database with no API key required
 */

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal_serving'?: number;
  proteins_100g?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
  fiber_100g?: number;
  fiber_serving?: number;
  sugars_100g?: number;
  sugars_serving?: number;
  'saturated-fat_100g'?: number;
  'saturated-fat_serving'?: number;
  cholesterol_100g?: number;
  cholesterol_serving?: number;
  sodium_100g?: number;
  sodium_serving?: number;
}

interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OFFNutriments;
  nutriscore_grade?: string;
  nova_group?: number;
  image_url?: string;
  image_small_url?: string;
}

interface OFFSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OFFProduct[];
}

interface OFFProductResponse {
  status: number;
  status_verbose: string;
  product?: OFFProduct;
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl = 'https://world.openfoodfacts.org';
  private readonly userAgent =
    'VaraPerformance/1.0 (contact@varaperformance.com)';

  /**
   * Search Open Food Facts database
   */
  async search(query: string, limit = 10): Promise<NormalizedFood[]> {
    try {
      const url = new URL(`${this.baseUrl}/cgi/search.pl`);
      url.searchParams.set('search_terms', query);
      url.searchParams.set('search_simple', '1');
      url.searchParams.set('action', 'process');
      url.searchParams.set('json', '1');
      url.searchParams.set('page_size', String(limit));
      url.searchParams.set(
        'fields',
        'code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments',
      );

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`Open Food Facts search failed: ${response.status}`);
        return [];
      }

      const data: OFFSearchResponse = await response.json();
      return data.products
        .filter((p) => p.product_name || p.product_name_en)
        .map((p) => this.normalizeProduct(p));
    } catch (error) {
      this.logger.error('Open Food Facts search error', error);
      return [];
    }
  }

  /**
   * Get product by barcode
   */
  async getByBarcode(barcode: string): Promise<NormalizedFood | null> {
    try {
      const url = `${this.baseUrl}/api/v2/product/${barcode}.json`;
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;

      const data: OFFProductResponse = await response.json();
      if (data.status !== 1 || !data.product) return null;

      return this.normalizeProduct(data.product);
    } catch (error) {
      this.logger.error('Open Food Facts barcode lookup error', error);
      return null;
    }
  }

  private normalizeProduct(product: OFFProduct): NormalizedFood {
    const n = product.nutriments || {};

    // Prefer per-serving values if available, otherwise use per 100g
    const hasServingData = n['energy-kcal_serving'] !== undefined;
    const servingSize = product.serving_quantity || (hasServingData ? 1 : 100);

    const calories = hasServingData
      ? (n['energy-kcal_serving'] ?? 0)
      : (n['energy-kcal_100g'] ?? 0);

    const protein = hasServingData
      ? (n.proteins_serving ?? 0)
      : (n.proteins_100g ?? 0);

    const carbs = hasServingData
      ? (n.carbohydrates_serving ?? 0)
      : (n.carbohydrates_100g ?? 0);

    const fat = hasServingData ? (n.fat_serving ?? 0) : (n.fat_100g ?? 0);

    const fiber = hasServingData
      ? (n.fiber_serving ?? null)
      : (n.fiber_100g ?? null);

    const sugar = hasServingData
      ? (n.sugars_serving ?? null)
      : (n.sugars_100g ?? null);

    const saturatedFat = hasServingData
      ? (n['saturated-fat_serving'] ?? null)
      : (n['saturated-fat_100g'] ?? null);

    const cholesterol = hasServingData
      ? (n.cholesterol_serving ?? null)
      : (n.cholesterol_100g ?? null);

    // Sodium in OFF is mg per 100g, convert if per serving
    const sodium = hasServingData
      ? n.sodium_serving
        ? n.sodium_serving * 1000
        : null // OFF stores in g
      : n.sodium_100g
        ? n.sodium_100g * 1000
        : null;

    return {
      name: product.product_name_en || product.product_name || 'Unknown',
      brand: product.brands || null,
      barcode: product.code || null,
      servingSize,
      servingUnit: hasServingData ? 'SERVING' : 'G',
      servingLabel: product.serving_size || null,
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbohydrates: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: fiber !== null ? Math.round(fiber * 10) / 10 : null,
      sugar: sugar !== null ? Math.round(sugar * 10) / 10 : null,
      saturatedFat:
        saturatedFat !== null ? Math.round(saturatedFat * 10) / 10 : null,
      cholesterol: cholesterol !== null ? Math.round(cholesterol) : null,
      sodium: sodium !== null ? Math.round(sodium) : null,
      source: 'OPENFOOD',
      externalId: product.code,
    };
  }
}

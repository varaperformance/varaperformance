import type {
  MealType,
  ServingUnit,
  FoodSource,
} from '../schemas/nutrition.schema';

/**
 * Food response (from database)
 */
export interface FoodResponse {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  barcode: string | null;
  source: FoodSource;
  isVerified: boolean;
  isPrivate: boolean;
  createdById: string | null;
  servingSize: number;
  servingUnit: ServingUnit;
  servingLabel: string | null;
  householdSize: number | null;
  householdUnit: string | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  potassium: number | null;
  vitaminA: number | null;
  vitaminC: number | null;
  calcium: number | null;
  iron: number | null;
  createdAt: string;
}

/**
 * Simplified food for lists
 */
export interface FoodListItem {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  servingSize: number;
  servingUnit: ServingUnit;
  servingLabel: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  createdById: string | null;
  source: FoodSource;
}

/**
 * Food log response
 */
export interface FoodLogResponse {
  id: string;
  loggedAt: string;
  mealType: MealType;
  recipeId: string | null;
  recipe: {
    id: string;
    name: string;
    imageUrl: string | null;
  } | null;
  food: FoodListItem | null;
  servings: number;
  servingSize: number | null;
  servingUnit: ServingUnit | null;
  quickAddName: string | null;
  quickAddCalories: number | null;
  quickAddProtein: number | null;
  quickAddCarbs: number | null;
  quickAddFat: number | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  note: string | null;
}

/**
 * Nutrition goal response
 */
export interface NutritionGoalResponse {
  id: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number | null;
  targetSodium: number | null;
  targetSugar: number | null;
  breakfastPercent: number;
  lunchPercent: number;
  dinnerPercent: number;
  snacksPercent: number;
}

/**
 * Meal summary for a specific meal type
 */
export interface MealSummary {
  mealType: MealType;
  logs: FoodLogResponse[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

/**
 * Daily nutrition summary
 */
export interface DailyNutritionSummary {
  date: string;
  meals: {
    breakfast: MealSummary;
    lunch: MealSummary;
    dinner: MealSummary;
    snacks: MealSummary;
  };
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goal: NutritionGoalResponse | null;
  progress: {
    calories: number; // Percentage
    protein: number;
    carbs: number;
    fat: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Favorite food
 */
export interface FavoriteFoodResponse {
  id: string;
  food: FoodListItem;
  defaultServings: number | null;
  defaultServingUnit: ServingUnit | null;
  createdAt: string;
}

/**
 * Recent food (for quick add)
 */
export interface RecentFoodResponse {
  food: FoodListItem;
  lastUsed: string;
  useCount: number;
}

/**
 * Food search result
 */
export interface FoodSearchResult {
  items: FoodListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  sourcesSearched: string[];
}

export interface RecipeIngredientResponse {
  id: string;
  foodId: string;
  food: FoodListItem;
  quantity: number;
  note: string | null;
  sortOrder: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeCategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

export interface RecipeCategoryListItem extends RecipeCategoryResponse {
  _count: { recipes: number };
  createdAt: string;
  updatedAt: string;
}

export interface RecipeListItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  totalServings: number;
  isPublic: boolean;
  isVerified: boolean;
  createdById: string;
  ingredientCount: number;
  totals: RecipeMacros;
  perServing: RecipeMacros;
  isSaved: boolean;
  categories: RecipeCategoryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeResponse extends RecipeListItem {
  directions: string[];
  ingredients: RecipeIngredientResponse[];
}

export interface RecipeSearchResult {
  items: RecipeListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

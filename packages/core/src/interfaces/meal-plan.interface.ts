import type { MealType } from '../schemas/nutrition.schema';
import type { FoodListItem, RecipeMacros } from './nutrition.interface';

export interface MealPlanItemResponse {
  id: string;
  dayOfWeek: number;
  mealType: MealType;
  sortOrder: number;
  food: FoodListItem | null;
  recipe: {
    id: string;
    name: string;
    imageUrl: string | null;
    perServing: RecipeMacros;
  } | null;
  servings: number;
  customName: string | null;
  customCalories: number | null;
  customProtein: number | null;
  customCarbs: number | null;
  customFat: number | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface MealPlanResponse {
  id: string;
  name: string;
  isActive: boolean;
  items: MealPlanItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanListItem {
  id: string;
  name: string;
  isActive: boolean;
  itemCount: number;
  totalDailyCalories: number;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanDaySummary {
  dayOfWeek: number;
  meals: {
    mealType: MealType;
    items: MealPlanItemResponse[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

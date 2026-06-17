// Food select - full details
export const foodSelect = {
  id: true,
  name: true,
  brand: true,
  description: true,
  barcode: true,
  source: true,
  isVerified: true,
  isPrivate: true,
  createdById: true,
  servingSize: true,
  servingUnit: true,
  servingLabel: true,
  householdSize: true,
  householdUnit: true,
  calories: true,
  protein: true,
  carbohydrates: true,
  fat: true,
  fiber: true,
  sugar: true,
  saturatedFat: true,
  transFat: true,
  cholesterol: true,
  sodium: true,
  potassium: true,
  vitaminA: true,
  vitaminC: true,
  calcium: true,
  iron: true,
  createdAt: true,
} as const;

// Food list select - simplified for lists
export const foodListSelect = {
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
} as const;

// Food log select
export const foodLogSelect = {
  id: true,
  loggedAt: true,
  mealType: true,
  recipeId: true,
  recipe: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
    },
  },
  food: {
    select: foodListSelect,
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
} as const;

// Nutrition goal select
export const nutritionGoalSelect = {
  id: true,
  targetCalories: true,
  targetProtein: true,
  targetCarbs: true,
  targetFat: true,
  targetFiber: true,
  targetSodium: true,
  targetSugar: true,
  breakfastPercent: true,
  lunchPercent: true,
  dinnerPercent: true,
  snacksPercent: true,
} as const;

// Favorite food select
export const favoriteFoodSelect = {
  id: true,
  food: {
    select: foodListSelect,
  },
  defaultServings: true,
  defaultServingUnit: true,
  createdAt: true,
} as const;

export type FoodSelect = typeof foodSelect;
export type FoodListSelect = typeof foodListSelect;
export type FoodLogSelect = typeof foodLogSelect;
export type NutritionGoalSelect = typeof nutritionGoalSelect;
export type FavoriteFoodSelect = typeof favoriteFoodSelect;

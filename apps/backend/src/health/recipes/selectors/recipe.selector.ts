import { foodListSelect } from '../../nutrition/selectors/nutrition.selector';

export const recipeListSelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  totalServings: true,
  isPublic: true,
  isVerified: true,
  createdById: true,
  totalCalories: true,
  totalProtein: true,
  totalCarbs: true,
  totalFat: true,
  perServingCalories: true,
  perServingProtein: true,
  perServingCarbs: true,
  perServingFat: true,
  createdAt: true,
  updatedAt: true,
  ingredients: {
    select: {
      id: true,
    },
  },
  savedBy: {
    select: {
      id: true,
      userId: true,
    },
  },
  categories: {
    select: {
      recipeCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          sortOrder: true,
        },
      },
    },
  },
} as const;

export const recipeSelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  directions: true,
  totalServings: true,
  isPublic: true,
  isVerified: true,
  createdById: true,
  totalCalories: true,
  totalProtein: true,
  totalCarbs: true,
  totalFat: true,
  perServingCalories: true,
  perServingProtein: true,
  perServingCarbs: true,
  perServingFat: true,
  createdAt: true,
  updatedAt: true,
  ingredients: {
    select: {
      id: true,
      foodId: true,
      quantity: true,
      note: true,
      sortOrder: true,
      totalCalories: true,
      totalProtein: true,
      totalCarbs: true,
      totalFat: true,
      food: {
        select: foodListSelect,
      },
    },
  },
  savedBy: {
    select: {
      id: true,
      userId: true,
    },
  },
  categories: {
    select: {
      recipeCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          sortOrder: true,
        },
      },
    },
  },
} as const;

export type RecipeListSelect = typeof recipeListSelect;
export type RecipeSelect = typeof recipeSelect;

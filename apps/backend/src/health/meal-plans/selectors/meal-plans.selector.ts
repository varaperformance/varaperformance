import { foodListSelect } from '../../nutrition/selectors/nutrition.selector';

export const mealPlanItemSelect = {
  id: true,
  dayOfWeek: true,
  mealType: true,
  sortOrder: true,
  food: { select: foodListSelect },
  recipe: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      perServingCalories: true,
      perServingProtein: true,
      perServingCarbs: true,
      perServingFat: true,
    },
  },
  servings: true,
  customName: true,
  customCalories: true,
  customProtein: true,
  customCarbs: true,
  customFat: true,
  totalCalories: true,
  totalProtein: true,
  totalCarbs: true,
  totalFat: true,
} as const;

export const mealPlanSelect = {
  id: true,
  name: true,
  isActive: true,
  items: {
    select: mealPlanItemSelect,
    orderBy: [
      { dayOfWeek: 'asc' as const },
      { mealType: 'asc' as const },
      { sortOrder: 'asc' as const },
    ] as {
      dayOfWeek?: 'asc' | 'desc';
      mealType?: 'asc' | 'desc';
      sortOrder?: 'asc' | 'desc';
    }[],
  },
  createdAt: true,
  updatedAt: true,
};

export const mealPlanListSelect = {
  id: true,
  name: true,
  isActive: true,
  _count: { select: { items: true } },
  items: {
    select: { totalCalories: true, dayOfWeek: true },
  },
  createdAt: true,
  updatedAt: true,
};

import { z } from 'zod';

// ==================== ENUMS ====================

export const MealTypeSchema = z.enum([
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACKS',
]);

export const ServingUnitSchema = z.enum([
  'G', // Grams
  'ML', // Milliliters
  'OZ', // Ounces
  'CUP', // Cups
  'TBSP', // Tablespoons
  'TSP', // Teaspoons
  'PIECE', // Piece/Item
  'SERVING', // Generic serving
  'SLICE', // Slice
  'BOWL', // Bowl
  'CONTAINER', // Container
  'SCOOP', // Scoop
]);

export const FoodSourceSchema = z.enum([
  'SYSTEM', // Pre-loaded verified foods
  'USER', // User-created custom foods
  'COMMUNITY', // Shared by other users
  'USDA', // USDA FoodData Central
  'OPENFOOD', // Open Food Facts database
]);

// ==================== FOOD ====================

// Base food data
export const FoodDataSchema = z.object({
  name: z.string().min(1).max(255),
  brand: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  barcode: z.string().max(50).optional(),

  // Serving info
  servingSize: z.number().positive().default(1),
  servingUnit: ServingUnitSchema.default('SERVING'),
  servingLabel: z.string().max(100).optional(),

  // Household measure
  householdSize: z.number().positive().optional(),
  householdUnit: z.string().max(50).optional(),

  // Macros (per serving)
  calories: z.number().min(0).default(0),
  protein: z.number().min(0).default(0),
  carbohydrates: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),

  // Extended nutrition
  fiber: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
  saturatedFat: z.number().min(0).optional(),
  transFat: z.number().min(0).optional(),
  cholesterol: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  potassium: z.number().min(0).optional(),
  vitaminA: z.number().min(0).optional(),
  vitaminC: z.number().min(0).optional(),
  calcium: z.number().min(0).optional(),
  iron: z.number().min(0).optional(),

  // Privacy
  isPrivate: z.boolean().optional(),

  // Source (admin-managed)
  source: FoodSourceSchema.optional(),
});

// Create custom food
export const CreateFoodSchema = FoodDataSchema;

// Update food
export const UpdateFoodSchema = FoodDataSchema.partial();

// Search foods
export const SearchFoodsSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  brand: z.string().optional(),
  source: FoodSourceSchema.optional(),
  barcode: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Food params
export const FoodParamsSchema = z.object({
  id: z.uuid(),
});

// ==================== FOOD LOG ====================

// Create food log entry
export const CreateFoodLogSchema = z
  .object({
    // Date and meal
    loggedAt: z.iso.datetime().optional(), // Defaults to now
    mealType: MealTypeSchema.default('BREAKFAST'),

    // Food reference (optional for quick add)
    foodId: z.uuid().optional(),

    // Servings
    servings: z.number().positive().default(1),
    servingSize: z.number().positive().optional(),
    servingUnit: ServingUnitSchema.optional(),

    // Quick add (alternative to foodId)
    quickAddName: z.string().max(100).optional(),
    quickAddCalories: z.number().min(0).optional(),
    quickAddProtein: z.number().min(0).optional(),
    quickAddCarbs: z.number().min(0).optional(),
    quickAddFat: z.number().min(0).optional(),

    note: z.string().max(255).optional(),
  })
  .refine((data) => data.foodId || data.quickAddCalories !== undefined, {
    message: 'Either foodId or quickAddCalories is required',
  });

// Update food log entry
export const UpdateFoodLogSchema = z.object({
  mealType: MealTypeSchema.optional(),
  servings: z.number().positive().optional(),
  note: z.string().max(255).optional(),
});

// Query food logs
export const FoodLogQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // Defaults to today
  mealType: MealTypeSchema.optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// Food log params
export const FoodLogParamsSchema = z.object({
  id: z.uuid(),
});

// ==================== NUTRITION GOAL ====================

export const NutritionGoalDataSchema = z.object({
  targetCalories: z.number().positive().default(2000),
  targetProtein: z.number().min(0).default(150),
  targetCarbs: z.number().min(0).default(200),
  targetFat: z.number().min(0).default(65),
  targetFiber: z.number().min(0).optional(),
  targetSodium: z.number().min(0).optional(),
  targetSugar: z.number().min(0).optional(),
  breakfastPercent: z.number().min(0).max(100).default(25),
  lunchPercent: z.number().min(0).max(100).default(35),
  dinnerPercent: z.number().min(0).max(100).default(30),
  snacksPercent: z.number().min(0).max(100).default(10),
});

export const UpdateNutritionGoalSchema = NutritionGoalDataSchema.partial();

// ==================== FAVORITE FOODS ====================

export const AddFavoriteFoodSchema = z.object({
  foodId: z.uuid(),
  defaultServings: z.number().positive().optional(),
  defaultServingUnit: ServingUnitSchema.optional(),
});

// ==================== RECIPE CATEGORIES ====================

export const CreateRecipeCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const UpdateRecipeCategorySchema = CreateRecipeCategorySchema.partial();

export const RecipeCategoryParamsSchema = z.object({
  id: z.uuid(),
});

export const RecipeCategoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
});

// ==================== RECIPES ====================

export const RecipeIngredientInputSchema = z.object({
  foodId: z.uuid(),
  quantity: z.number().positive(), // Number of base servings for the selected food
  note: z.string().max(255).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const CreateRecipeSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  imageUrl: z.string().max(255).optional(),
  directions: z.array(z.string().min(1).max(500)).min(1).max(100),
  totalServings: z.number().positive().default(1),
  isPublic: z.boolean().default(false),
  ingredients: z.array(RecipeIngredientInputSchema).min(1).max(100),
  categoryIds: z.array(z.uuid()).max(10).optional(),
});

export const UpdateRecipeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    imageUrl: z.string().max(255).nullable().optional(),
    directions: z.array(z.string().min(1).max(500)).min(1).max(100).optional(),
    totalServings: z.number().positive().optional(),
    isPublic: z.boolean().optional(),
    ingredients: z
      .array(RecipeIngredientInputSchema)
      .min(1)
      .max(100)
      .optional(),
    categoryIds: z.array(z.uuid()).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const RecipeSortSchema = z.enum(['random', 'name', 'newest', 'oldest']);

export const SearchRecipesSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  categoryId: z.uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  mine: z.coerce.boolean().optional(),
  saved: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  sort: RecipeSortSchema.default('random'),
  seed: z.coerce.number().optional(),
});

export const RecipeParamsSchema = z.object({
  id: z.uuid(),
});

export const LogRecipeSchema = z.object({
  loggedAt: z.iso.datetime().optional(),
  mealType: MealTypeSchema.default('BREAKFAST'),
  servings: z.number().positive().default(1),
  note: z.string().max(255).optional(),
});

// ==================== INFERRED TYPES ====================

export type MealType = z.infer<typeof MealTypeSchema>;
export type ServingUnit = z.infer<typeof ServingUnitSchema>;
export type FoodSource = z.infer<typeof FoodSourceSchema>;
export type FoodData = z.infer<typeof FoodDataSchema>;
export type CreateFood = z.infer<typeof CreateFoodSchema>;
export type UpdateFood = z.infer<typeof UpdateFoodSchema>;
export type SearchFoods = z.infer<typeof SearchFoodsSchema>;
export type FoodParams = z.infer<typeof FoodParamsSchema>;
export type CreateFoodLog = z.infer<typeof CreateFoodLogSchema>;
export type UpdateFoodLog = z.infer<typeof UpdateFoodLogSchema>;
export type FoodLogQuery = z.infer<typeof FoodLogQuerySchema>;
export type FoodLogParams = z.infer<typeof FoodLogParamsSchema>;
export type NutritionGoalData = z.infer<typeof NutritionGoalDataSchema>;
export type UpdateNutritionGoal = z.infer<typeof UpdateNutritionGoalSchema>;
export type AddFavoriteFood = z.infer<typeof AddFavoriteFoodSchema>;
export type CreateRecipeCategory = z.infer<typeof CreateRecipeCategorySchema>;
export type UpdateRecipeCategory = z.infer<typeof UpdateRecipeCategorySchema>;
export type RecipeCategoryParams = z.infer<typeof RecipeCategoryParamsSchema>;
export type RecipeCategoryQuery = z.infer<typeof RecipeCategoryQuerySchema>;
export type RecipeIngredientInput = z.infer<typeof RecipeIngredientInputSchema>;
export type CreateRecipe = z.infer<typeof CreateRecipeSchema>;
export type UpdateRecipe = z.infer<typeof UpdateRecipeSchema>;
export type SearchRecipes = z.infer<typeof SearchRecipesSchema>;
export type RecipeSort = z.infer<typeof RecipeSortSchema>;
export type RecipeParams = z.infer<typeof RecipeParamsSchema>;
export type LogRecipe = z.infer<typeof LogRecipeSchema>;

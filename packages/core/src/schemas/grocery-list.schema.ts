import { z } from 'zod';

// ==================== STATUS ====================

export const GroceryListStatusSchema = z.enum([
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED',
]);

// ==================== GROCERY LIST ====================

export const CreateGroceryListSchema = z.object({
  name: z.string().min(1).max(120),
  mealPlanId: z.string().uuid().optional(),
});

export const UpdateGroceryListSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: GroceryListStatusSchema.optional(),
});

export const GroceryListParamsSchema = z.object({
  id: z.string().uuid(),
});

// ==================== GROCERY LIST ITEMS ====================

export const CreateGroceryListItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  category: z.string().max(60).optional(),
  foodId: z.string().uuid().optional(),
  note: z.string().max(255).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const UpdateGroceryListItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  category: z.string().max(60).optional(),
  isChecked: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  note: z.string().max(255).nullable().optional(),
});

export const GroceryListItemParamsSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
});

// ==================== BATCH ====================

export const BatchCheckItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  isChecked: z.boolean(),
});

// ==================== SEED FROM MEAL PLAN ====================

export const SeedFromMealPlanSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  mealPlanId: z.string().uuid(),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  servingsMultiplier: z.number().positive().default(1),
});

// ==================== SEED FROM RECIPE ====================

export const SeedFromRecipeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  recipeId: z.string().uuid(),
  servingsMultiplier: z.number().positive().default(1),
});

// ==================== INFERRED TYPES ====================

export type GroceryListStatus = z.infer<typeof GroceryListStatusSchema>;
export type CreateGroceryList = z.infer<typeof CreateGroceryListSchema>;
export type UpdateGroceryList = z.infer<typeof UpdateGroceryListSchema>;
export type GroceryListParams = z.infer<typeof GroceryListParamsSchema>;
export type CreateGroceryListItem = z.infer<typeof CreateGroceryListItemSchema>;
export type UpdateGroceryListItem = z.infer<typeof UpdateGroceryListItemSchema>;
export type GroceryListItemParams = z.infer<typeof GroceryListItemParamsSchema>;
export type BatchCheckItems = z.infer<typeof BatchCheckItemsSchema>;
export type SeedFromMealPlan = z.input<typeof SeedFromMealPlanSchema>;
export type SeedFromRecipe = z.input<typeof SeedFromRecipeSchema>;

import { z } from 'zod';
import { MealTypeSchema } from './nutrition.schema';

// ==================== MEAL PLAN ====================

export const CreateMealPlanSchema = z.object({
  name: z.string().min(1).max(120),
});

export const UpdateMealPlanSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
});

export const MealPlanParamsSchema = z.object({
  id: z.uuid(),
});

// ==================== MEAL PLAN ITEMS ====================

export const CreateMealPlanItemSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    mealType: MealTypeSchema,
    sortOrder: z.number().int().min(0).optional(),

    // Food or recipe reference
    foodId: z.uuid().optional(),
    recipeId: z.uuid().optional(),

    // Serving info
    servings: z.number().positive().default(1),

    // Quick-add alternative
    customName: z.string().max(100).optional(),
    customCalories: z.number().min(0).optional(),
    customProtein: z.number().min(0).optional(),
    customCarbs: z.number().min(0).optional(),
    customFat: z.number().min(0).optional(),
  })
  .refine(
    (data) => data.foodId || data.recipeId || data.customCalories !== undefined,
    {
      message: 'Either foodId, recipeId, or customCalories is required',
    },
  );

export const UpdateMealPlanItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  mealType: MealTypeSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  servings: z.number().positive().optional(),
});

export const MealPlanItemParamsSchema = z.object({
  id: z.uuid(),
  itemId: z.uuid(),
});

// ==================== COPY DAY ====================

export const CopyMealPlanDaySchema = z.object({
  sourceDay: z.number().int().min(0).max(6),
  targetDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

// ==================== QUICK LOG ====================

export const QuickLogMealPlanSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  mealType: MealTypeSchema.optional(),
});

// ==================== AUTO-GENERATE FROM MACROS ====================

export const GenerateFromMacrosSchema = z.object({
  /** Optional plan name; defaults to "Auto-generated Plan" */
  name: z.string().min(1).max(120).optional(),
  /** Days to populate (0-6). Defaults to all 7. */
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  /** Whether to allow variation between days or replicate one template day. */
  varyByDay: z.boolean().optional().default(false),
});

// ==================== INFERRED TYPES ====================

export type CreateMealPlan = z.infer<typeof CreateMealPlanSchema>;
export type UpdateMealPlan = z.infer<typeof UpdateMealPlanSchema>;
export type MealPlanParams = z.infer<typeof MealPlanParamsSchema>;
export type CreateMealPlanItem = z.infer<typeof CreateMealPlanItemSchema>;
export type UpdateMealPlanItem = z.infer<typeof UpdateMealPlanItemSchema>;
export type MealPlanItemParams = z.infer<typeof MealPlanItemParamsSchema>;
export type CopyMealPlanDay = z.infer<typeof CopyMealPlanDaySchema>;
export type QuickLogMealPlan = z.infer<typeof QuickLogMealPlanSchema>;
export type GenerateFromMacros = z.infer<typeof GenerateFromMacrosSchema>;

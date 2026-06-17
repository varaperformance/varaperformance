import { createZodDto } from 'nestjs-zod';
import {
  CreateMealPlanSchema,
  UpdateMealPlanSchema,
  MealPlanParamsSchema,
  CreateMealPlanItemSchema,
  UpdateMealPlanItemSchema,
  MealPlanItemParamsSchema,
  CopyMealPlanDaySchema,
  QuickLogMealPlanSchema,
  GenerateFromMacrosSchema,
} from '@varaperformance/core';

export class CreateMealPlanDto extends createZodDto(CreateMealPlanSchema) {}
export class UpdateMealPlanDto extends createZodDto(UpdateMealPlanSchema) {}
export class MealPlanParamsDto extends createZodDto(MealPlanParamsSchema) {}
export class CreateMealPlanItemDto extends createZodDto(
  CreateMealPlanItemSchema,
) {}
export class UpdateMealPlanItemDto extends createZodDto(
  UpdateMealPlanItemSchema,
) {}
export class MealPlanItemParamsDto extends createZodDto(
  MealPlanItemParamsSchema,
) {}
export class CopyMealPlanDayDto extends createZodDto(CopyMealPlanDaySchema) {}
export class QuickLogMealPlanDto extends createZodDto(QuickLogMealPlanSchema) {}
export class GenerateFromMacrosDto extends createZodDto(
  GenerateFromMacrosSchema,
) {}

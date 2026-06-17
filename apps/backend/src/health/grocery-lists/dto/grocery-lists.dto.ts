import { createZodDto } from 'nestjs-zod';
import {
  CreateGroceryListSchema,
  UpdateGroceryListSchema,
  GroceryListParamsSchema,
  CreateGroceryListItemSchema,
  UpdateGroceryListItemSchema,
  GroceryListItemParamsSchema,
  BatchCheckItemsSchema,
  SeedFromMealPlanSchema,
  SeedFromRecipeSchema,
} from '@varaperformance/core';

export class CreateGroceryListDto extends createZodDto(
  CreateGroceryListSchema,
) {}
export class UpdateGroceryListDto extends createZodDto(
  UpdateGroceryListSchema,
) {}
export class GroceryListParamsDto extends createZodDto(
  GroceryListParamsSchema,
) {}
export class CreateGroceryListItemDto extends createZodDto(
  CreateGroceryListItemSchema,
) {}
export class UpdateGroceryListItemDto extends createZodDto(
  UpdateGroceryListItemSchema,
) {}
export class GroceryListItemParamsDto extends createZodDto(
  GroceryListItemParamsSchema,
) {}
export class BatchCheckItemsDto extends createZodDto(BatchCheckItemsSchema) {}
export class SeedFromMealPlanDto extends createZodDto(SeedFromMealPlanSchema) {}
export class SeedFromRecipeDto extends createZodDto(SeedFromRecipeSchema) {}

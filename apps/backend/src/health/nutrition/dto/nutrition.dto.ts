import { createZodDto } from 'nestjs-zod';
import {
  CreateFoodSchema,
  UpdateFoodSchema,
  SearchFoodsSchema,
  FoodParamsSchema,
  CreateFoodLogSchema,
  UpdateFoodLogSchema,
  FoodLogQuerySchema,
  FoodLogParamsSchema,
  UpdateNutritionGoalSchema,
  AddFavoriteFoodSchema,
} from '@varaperformance/core';

// Food DTOs
export class CreateFoodDto extends createZodDto(CreateFoodSchema) {}
export class UpdateFoodDto extends createZodDto(UpdateFoodSchema) {}
export class SearchFoodsDto extends createZodDto(SearchFoodsSchema) {}
export class FoodParamsDto extends createZodDto(FoodParamsSchema) {}

// Food Log DTOs
export class CreateFoodLogDto extends createZodDto(CreateFoodLogSchema) {}
export class UpdateFoodLogDto extends createZodDto(UpdateFoodLogSchema) {}
export class FoodLogQueryDto extends createZodDto(FoodLogQuerySchema) {}
export class FoodLogParamsDto extends createZodDto(FoodLogParamsSchema) {}

// Nutrition Goal DTOs
export class UpdateNutritionGoalDto extends createZodDto(
  UpdateNutritionGoalSchema,
) {}

// Favorite Food DTOs
export class AddFavoriteFoodDto extends createZodDto(AddFavoriteFoodSchema) {}

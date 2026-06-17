import { createZodDto } from 'nestjs-zod';
import {
  CreateRecipeSchema,
  UpdateRecipeSchema,
  SearchRecipesSchema,
  RecipeParamsSchema,
  LogRecipeSchema,
} from '@varaperformance/core';

export class CreateRecipeDto extends createZodDto(CreateRecipeSchema) {}
export class UpdateRecipeDto extends createZodDto(UpdateRecipeSchema) {}
export class SearchRecipesDto extends createZodDto(SearchRecipesSchema) {}
export class RecipeParamsDto extends createZodDto(RecipeParamsSchema) {}
export class LogRecipeDto extends createZodDto(LogRecipeSchema) {}

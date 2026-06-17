import { createZodDto } from 'nestjs-zod';
import {
  CreateRecipeCategorySchema,
  UpdateRecipeCategorySchema,
  RecipeCategoryParamsSchema,
  RecipeCategoryQuerySchema,
} from '@varaperformance/core';

export class CreateRecipeCategoryDto extends createZodDto(
  CreateRecipeCategorySchema,
) {}
export class UpdateRecipeCategoryDto extends createZodDto(
  UpdateRecipeCategorySchema,
) {}
export class RecipeCategoryParamsDto extends createZodDto(
  RecipeCategoryParamsSchema,
) {}
export class RecipeCategoryQueryDto extends createZodDto(
  RecipeCategoryQuerySchema,
) {}

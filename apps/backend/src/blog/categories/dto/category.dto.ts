import { createZodDto } from 'nestjs-zod';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryParamsSchema,
  CategoryQuerySchema,
} from '@varaperformance/core';

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
export class CategoryParamsDto extends createZodDto(CategoryParamsSchema) {}
export class CategoryQueryDto extends createZodDto(CategoryQuerySchema) {}

import { createZodDto } from 'nestjs-zod';
import {
  CreateFaqCategorySchema,
  UpdateFaqCategorySchema,
  FaqCategoryQuerySchema,
  CreateFaqSchema,
  UpdateFaqSchema,
  FaqQuerySchema,
} from '@varaperformance/core';

// FAQ Category DTOs
export class CreateFaqCategoryDto extends createZodDto(
  CreateFaqCategorySchema,
) {}

export class UpdateFaqCategoryDto extends createZodDto(
  UpdateFaqCategorySchema,
) {}

export class FaqCategoryQueryDto extends createZodDto(FaqCategoryQuerySchema) {}

// FAQ DTOs
export class CreateFaqDto extends createZodDto(CreateFaqSchema) {}

export class UpdateFaqDto extends createZodDto(UpdateFaqSchema) {}

export class FaqQueryDto extends createZodDto(FaqQuerySchema) {}

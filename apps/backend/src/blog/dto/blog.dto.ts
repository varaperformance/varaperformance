import { createZodDto } from 'nestjs-zod';
import {
  CreateBlogSchema,
  UpdateBlogSchema,
  BlogParamsSchema,
  BlogSlugParamsSchema,
  BlogQuerySchema,
  PaginationSchema,
} from '@varaperformance/core';

// Blog DTOs
export class CreateBlogDto extends createZodDto(CreateBlogSchema) {}

export class UpdateBlogDto extends createZodDto(UpdateBlogSchema) {}

// Params DTOs
export class BlogParamsDto extends createZodDto(BlogParamsSchema) {}

export class BlogSlugParamsDto extends createZodDto(BlogSlugParamsSchema) {}

// Query DTOs
export class BlogQueryDto extends createZodDto(BlogQuerySchema) {}

export class PaginationDto extends createZodDto(PaginationSchema) {}

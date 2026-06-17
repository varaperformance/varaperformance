import { createZodDto } from 'nestjs-zod';
import {
  CreateTagSchema,
  UpdateTagSchema,
  TagParamsSchema,
  TagQuerySchema,
} from '@varaperformance/core';

export class CreateTagDto extends createZodDto(CreateTagSchema) {}
export class UpdateTagDto extends createZodDto(UpdateTagSchema) {}
export class TagParamsDto extends createZodDto(TagParamsSchema) {}
export class TagQueryDto extends createZodDto(TagQuerySchema) {}

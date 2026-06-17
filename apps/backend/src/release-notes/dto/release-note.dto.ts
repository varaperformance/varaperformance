import { createZodDto } from 'nestjs-zod';
import {
  CreateReleaseNoteSchema,
  UpdateReleaseNoteSchema,
  ReleaseNoteQuerySchema,
} from '@varaperformance/core';

export class CreateReleaseNoteDto extends createZodDto(
  CreateReleaseNoteSchema,
) {}

export class UpdateReleaseNoteDto extends createZodDto(
  UpdateReleaseNoteSchema,
) {}

export class ReleaseNoteQueryDto extends createZodDto(ReleaseNoteQuerySchema) {}

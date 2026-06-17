import { createZodDto } from 'nestjs-zod';
import {
  ClimbEntriesQuerySchema,
  CreateClimbEntrySchema,
} from '@varaperformance/core';

export class CreateClimbEntryDto extends createZodDto(CreateClimbEntrySchema) {}

export class ClimbEntriesQueryDto extends createZodDto(
  ClimbEntriesQuerySchema,
) {}

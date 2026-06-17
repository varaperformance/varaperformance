import { createZodDto } from 'nestjs-zod';
import {
  CreatePersonalRecordSchema,
  UpdatePersonalRecordSchema,
  PersonalRecordQuerySchema,
  PersonalRecordParamsSchema,
} from '@varaperformance/core';

export class CreatePersonalRecordDto extends createZodDto(
  CreatePersonalRecordSchema,
) {}

export class UpdatePersonalRecordDto extends createZodDto(
  UpdatePersonalRecordSchema,
) {}

export class PersonalRecordQueryDto extends createZodDto(
  PersonalRecordQuerySchema,
) {}

export class PersonalRecordParamsDto extends createZodDto(
  PersonalRecordParamsSchema,
) {}

import { createZodDto } from 'nestjs-zod';
import {
  CreateAvailabilitySchema,
  UpdateAvailabilitySchema,
  AvailabilityParamsSchema,
  AvailabilityQuerySchema,
} from '@varaperformance/core';

export class CreateAvailabilityDto extends createZodDto(
  CreateAvailabilitySchema,
) {}
export class UpdateAvailabilityDto extends createZodDto(
  UpdateAvailabilitySchema,
) {}
export class AvailabilityParamsDto extends createZodDto(
  AvailabilityParamsSchema,
) {}
export class AvailabilityQueryDto extends createZodDto(
  AvailabilityQuerySchema,
) {}

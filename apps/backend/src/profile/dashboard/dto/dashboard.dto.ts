import { createZodDto } from 'nestjs-zod';
import { UpdateDashboardPreferenceSchema } from '@varaperformance/core';

export class UpdateDashboardPreferenceDto extends createZodDto(
  UpdateDashboardPreferenceSchema,
) {}

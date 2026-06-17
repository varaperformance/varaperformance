import { createZodDto } from 'nestjs-zod';
import { UpdateLifestyleGoalSchema } from '@varaperformance/core';

export class UpdateLifestyleGoalDto extends createZodDto(
  UpdateLifestyleGoalSchema,
) {}

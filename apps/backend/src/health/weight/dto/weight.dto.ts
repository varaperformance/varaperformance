import { createZodDto } from 'nestjs-zod';
import {
  CreateWeightLogSchema,
  UpdateWeightGoalSchema,
  WeightLogQuerySchema,
  WeightLogParamsSchema,
} from '@varaperformance/core';

export class CreateWeightLogDto extends createZodDto(CreateWeightLogSchema) {}

export class UpdateWeightGoalDto extends createZodDto(UpdateWeightGoalSchema) {}

export class WeightLogQueryDto extends createZodDto(WeightLogQuerySchema) {}

export class WeightLogParamsDto extends createZodDto(WeightLogParamsSchema) {}

import { createZodDto } from 'nestjs-zod';
import {
  CreateWaterLogSchema,
  UpdateWaterGoalSchema,
  WaterLogQuerySchema,
  WaterLogParamsSchema,
} from '@varaperformance/core';

export class CreateWaterLogDto extends createZodDto(CreateWaterLogSchema) {}

export class UpdateWaterGoalDto extends createZodDto(UpdateWaterGoalSchema) {}

export class WaterLogQueryDto extends createZodDto(WaterLogQuerySchema) {}

export class WaterLogParamsDto extends createZodDto(WaterLogParamsSchema) {}

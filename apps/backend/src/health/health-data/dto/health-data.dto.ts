import { createZodDto } from 'nestjs-zod';
import {
  LogStepsSchema,
  StepTrendQuerySchema,
  LogSleepSchema,
  SleepTrendQuerySchema,
  LogHeartRateBatchSchema,
  HeartRateQuerySchema,
  SyncHealthDataSchema,
  HealthLogParamsSchema,
  UpdateHealthSyncPreferenceSchema,
} from '@varaperformance/core';

export class LogStepsDto extends createZodDto(LogStepsSchema) {}
export class StepTrendQueryDto extends createZodDto(StepTrendQuerySchema) {}
export class LogSleepDto extends createZodDto(LogSleepSchema) {}
export class SleepTrendQueryDto extends createZodDto(SleepTrendQuerySchema) {}
export class LogHeartRateBatchDto extends createZodDto(
  LogHeartRateBatchSchema,
) {}
export class HeartRateQueryDto extends createZodDto(HeartRateQuerySchema) {}
export class SyncHealthDataDto extends createZodDto(SyncHealthDataSchema) {}
export class HealthLogParamsDto extends createZodDto(HealthLogParamsSchema) {}
export class UpdateHealthSyncPreferenceDto extends createZodDto(
  UpdateHealthSyncPreferenceSchema,
) {}

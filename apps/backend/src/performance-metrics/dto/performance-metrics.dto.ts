import { createZodDto } from 'nestjs-zod';
import {
  CreatePerformanceMetricSchema,
  PerformanceMetricQuerySchema,
} from '@varaperformance/core';

export class CreatePerformanceMetricDto extends createZodDto(
  CreatePerformanceMetricSchema,
) {}

export class PerformanceMetricQueryDto extends createZodDto(
  PerformanceMetricQuerySchema,
) {}

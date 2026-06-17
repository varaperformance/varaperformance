import { createZodDto } from 'nestjs-zod';
import {
  CreateBodyMeasurementSchema,
  BodyMeasurementQuerySchema,
  BodyMeasurementParamsSchema,
} from '@varaperformance/core';

export class CreateBodyMeasurementDto extends createZodDto(
  CreateBodyMeasurementSchema,
) {}

export class BodyMeasurementQueryDto extends createZodDto(
  BodyMeasurementQuerySchema,
) {}

export class BodyMeasurementParamsDto extends createZodDto(
  BodyMeasurementParamsSchema,
) {}

import { createZodDto } from 'nestjs-zod';
import {
  CreateInjectionProtocolSchema,
  UpdateInjectionProtocolSchema,
  CreateInjectionLogSchema,
  InjectionLogsQuerySchema,
  InjectionParamsSchema,
} from '@varaperformance/core';

export class CreateInjectionProtocolDto extends createZodDto(
  CreateInjectionProtocolSchema,
) {}

export class UpdateInjectionProtocolDto extends createZodDto(
  UpdateInjectionProtocolSchema,
) {}

export class CreateInjectionLogDto extends createZodDto(
  CreateInjectionLogSchema,
) {}

export class InjectionLogsQueryDto extends createZodDto(
  InjectionLogsQuerySchema,
) {}

export class InjectionParamsDto extends createZodDto(InjectionParamsSchema) {}

import { createZodDto } from 'nestjs-zod';
import {
  CreateHabitSchema,
  UpdateHabitSchema,
  LogHabitSchema,
  HabitQuerySchema,
  HabitLogQuerySchema,
  HabitParamsSchema,
} from '@varaperformance/core';

export class CreateHabitDto extends createZodDto(CreateHabitSchema) {}
export class UpdateHabitDto extends createZodDto(UpdateHabitSchema) {}
export class LogHabitDto extends createZodDto(LogHabitSchema) {}
export class HabitQueryDto extends createZodDto(HabitQuerySchema) {}
export class HabitLogQueryDto extends createZodDto(HabitLogQuerySchema) {}
export class HabitParamsDto extends createZodDto(HabitParamsSchema) {}

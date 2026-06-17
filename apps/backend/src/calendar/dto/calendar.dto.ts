import { createZodDto } from 'nestjs-zod';
import {
  CalendarRangeQuerySchema,
  CalendarUserParamsSchema,
  CreateCalendarEventSchema,
  EventIdParamsSchema,
  UpdateCalendarEventSchema,
} from '@varaperformance/core';

export class CalendarRangeQueryDto extends createZodDto(
  CalendarRangeQuerySchema,
) {}

export class CalendarUserParamsDto extends createZodDto(
  CalendarUserParamsSchema,
) {}

export class EventIdParamsDto extends createZodDto(EventIdParamsSchema) {}

export class CreateCalendarEventDto extends createZodDto(
  CreateCalendarEventSchema,
) {}

export class UpdateCalendarEventDto extends createZodDto(
  UpdateCalendarEventSchema,
) {}

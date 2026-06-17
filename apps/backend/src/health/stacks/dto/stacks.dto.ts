import { createZodDto } from 'nestjs-zod';
import {
  CreateStackSchema,
  UpdateStackSchema,
  AddStackItemSchema,
  UpdateStackItemSchema,
  BatchUpdateItemsSchema,
  LogIntakeSchema,
  StackParamsSchema,
  StackItemParamsSchema,
  StackLogsQuerySchema,
} from '@varaperformance/core';
import { z } from 'zod';

export class CreateStackDto extends createZodDto(CreateStackSchema) {}

export class UpdateStackDto extends createZodDto(UpdateStackSchema) {}

export class AddStackItemDto extends createZodDto(AddStackItemSchema) {}

export class UpdateStackItemDto extends createZodDto(UpdateStackItemSchema) {}

export class BatchUpdateItemsDto extends createZodDto(BatchUpdateItemsSchema) {}

export class LogIntakeDto extends createZodDto(LogIntakeSchema) {}

export class StackParamsDto extends createZodDto(StackParamsSchema) {}

export class StackItemParamsDto extends createZodDto(StackItemParamsSchema) {}

export class StackLogsQueryDto extends createZodDto(StackLogsQuerySchema) {}

// Date query for getting logs
export class DateQueryDto extends createZodDto(
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
) {}

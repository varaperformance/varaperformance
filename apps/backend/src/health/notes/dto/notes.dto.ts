import { createZodDto } from 'nestjs-zod';
import {
  CreateNoteSchema,
  UpdateNoteSchema,
  NoteParamsSchema,
  NoteQuerySchema,
} from '@varaperformance/core';

export class CreateNoteDto extends createZodDto(CreateNoteSchema) {}

export class UpdateNoteDto extends createZodDto(UpdateNoteSchema) {}

export class NoteParamsDto extends createZodDto(NoteParamsSchema) {}

export class NoteQueryDto extends createZodDto(NoteQuerySchema) {}

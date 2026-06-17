import { createZodDto } from 'nestjs-zod';
import {
  CreateServiceSchema,
  UpdateServiceSchema,
  CreateIncidentSchema,
  UpdateIncidentSchema,
  AddIncidentNoteSchema,
  PaginationSchema,
} from '@varaperformance/core';

export class PaginationDto extends createZodDto(PaginationSchema) {}

// Service DTOs
export class CreateServiceDto extends createZodDto(CreateServiceSchema) {}

export class UpdateServiceDto extends createZodDto(UpdateServiceSchema) {}

// Incident DTOs
export class CreateIncidentDto extends createZodDto(CreateIncidentSchema) {}

export class UpdateIncidentDto extends createZodDto(UpdateIncidentSchema) {}

// IncidentNote DTOs
export class AddIncidentNoteDto extends createZodDto(AddIncidentNoteSchema) {}

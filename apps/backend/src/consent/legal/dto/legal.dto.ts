import { createZodDto } from 'nestjs-zod';
import {
  LegalDocumentIdParamsSchema,
  LegalDocumentTypeParamsSchema,
  LegalDocumentQuerySchema,
  CreateLegalDocumentSchema,
  CreateLegalDocumentVersionSchema,
} from '@varaperformance/core';

/**
 * Legal Document DTOs
 * SOC2/HIPAA: WORM (Write Once Read Many) compliant legal document management
 */

// Params DTOs
export class LegalDocumentIdParamsDto extends createZodDto(
  LegalDocumentIdParamsSchema,
) {}
export class LegalDocumentTypeParamsDto extends createZodDto(
  LegalDocumentTypeParamsSchema,
) {}

// Query DTOs
export class LegalDocumentQueryDto extends createZodDto(
  LegalDocumentQuerySchema,
) {}

// Body DTOs
export class CreateLegalDocumentDto extends createZodDto(
  CreateLegalDocumentSchema,
) {}
export class CreateLegalDocumentVersionDto extends createZodDto(
  CreateLegalDocumentVersionSchema,
) {}

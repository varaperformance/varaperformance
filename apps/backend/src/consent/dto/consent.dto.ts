import { createZodDto } from 'nestjs-zod';
import {
  ConsentGrantSchema,
  ReconsentSchema,
  RevokeConsentSchema,
  ConsentTypeSchema,
  EmailPreferencesSchema,
} from '@varaperformance/core';
import { z } from 'zod';

export class ConsentGrantDto extends createZodDto(ConsentGrantSchema) {}

export class ReconsentDto extends createZodDto(ReconsentSchema) {}

export class RevokeConsentDto extends createZodDto(RevokeConsentSchema) {}

export class EmailPreferencesDto extends createZodDto(EmailPreferencesSchema) {}

export class UnsubscribeQueryDto extends createZodDto(
  z.object({ token: z.string().min(1) }),
) {}

// Query DTOs
export class GetActiveLegalDocsDto extends createZodDto(
  z.object({
    types: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',') : undefined))
      .pipe(z.array(ConsentTypeSchema).optional()),
  }),
) {}

export class GetLegalDocumentDto extends createZodDto(
  z.object({
    type: ConsentTypeSchema,
    version: z.string().optional(),
  }),
) {}

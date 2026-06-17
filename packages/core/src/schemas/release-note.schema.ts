import { z } from 'zod';

// ==================== Enums ====================

export const ReleaseTypeEnum = z.enum(['MAJOR', 'MINOR', 'PATCH']);
export const ReleaseStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// ==================== Release Note Schemas ====================

export const CreateReleaseNoteSchema = z.object({
  version: z
    .string()
    .min(1)
    .max(20)
    .regex(/^\d+\.\d+\.\d+$/, {
      message: 'Version must follow semver format (e.g., 1.0.0)',
    }),
  title: z.string().max(200).optional(),
  type: ReleaseTypeEnum.default('MINOR'),
  status: ReleaseStatusEnum.default('DRAFT'),
  publishedAt: z.iso.datetime().optional(),
  highlights: z.array(z.string().min(1).max(500)).default([]),
  features: z.array(z.string().min(1).max(500)).default([]),
  improvements: z.array(z.string().min(1).max(500)).default([]),
  fixes: z.array(z.string().min(1).max(500)).default([]),
});

export const UpdateReleaseNoteSchema = CreateReleaseNoteSchema.partial();

export const ReleaseNoteParamsSchema = z.object({
  id: z.uuid(),
});

export const ReleaseNoteQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  type: ReleaseTypeEnum.optional(),
  status: ReleaseStatusEnum.optional(),
});

// ==================== Inferred Types ====================

export type CreateReleaseNote = z.infer<typeof CreateReleaseNoteSchema>;
export type UpdateReleaseNote = z.infer<typeof UpdateReleaseNoteSchema>;
export type ReleaseNoteParams = z.infer<typeof ReleaseNoteParamsSchema>;
export type ReleaseNoteQuery = z.infer<typeof ReleaseNoteQuerySchema>;

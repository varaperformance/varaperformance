import { z } from 'zod';

// Tag schemas
export const CreateTagSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
});

export const UpdateTagSchema = CreateTagSchema.partial();

export const TagParamsSchema = z.object({
  id: z.uuid(),
});

export const TagSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const TagQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

// Inferred types
export type CreateTag = z.infer<typeof CreateTagSchema>;
export type UpdateTag = z.infer<typeof UpdateTagSchema>;
export type TagParams = z.infer<typeof TagParamsSchema>;
export type TagSlugParams = z.infer<typeof TagSlugParamsSchema>;
export type TagQuery = z.infer<typeof TagQuerySchema>;

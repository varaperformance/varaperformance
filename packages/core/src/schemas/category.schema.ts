import { z } from 'zod';

// Category schemas
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CategoryParamsSchema = z.object({
  id: z.uuid(),
});

export const CategorySlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const CategoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

// Inferred types
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;
export type CategoryParams = z.infer<typeof CategoryParamsSchema>;
export type CategorySlugParams = z.infer<typeof CategorySlugParamsSchema>;
export type CategoryQuery = z.infer<typeof CategoryQuerySchema>;

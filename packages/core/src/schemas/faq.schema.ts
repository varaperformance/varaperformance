import { z } from 'zod';

// ==================== FAQ Category Schemas ====================

export const CreateFaqCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must be lowercase with hyphens only',
    }),
  description: z.string().max(500).optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const UpdateFaqCategorySchema = CreateFaqCategorySchema.partial();

export const FaqCategoryParamsSchema = z.object({
  id: z.uuid(),
});

export const FaqCategoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

// ==================== FAQ Schemas ====================

export const CreateFaqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  categoryId: z.uuid(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const UpdateFaqSchema = CreateFaqSchema.partial();

export const FaqParamsSchema = z.object({
  id: z.uuid(),
});

export const FaqQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
});

// ==================== Inferred Types ====================

export type CreateFaqCategory = z.infer<typeof CreateFaqCategorySchema>;
export type UpdateFaqCategory = z.infer<typeof UpdateFaqCategorySchema>;
export type FaqCategoryParams = z.infer<typeof FaqCategoryParamsSchema>;
export type FaqCategoryQuery = z.infer<typeof FaqCategoryQuerySchema>;

export type CreateFaq = z.infer<typeof CreateFaqSchema>;
export type UpdateFaq = z.infer<typeof UpdateFaqSchema>;
export type FaqParams = z.infer<typeof FaqParamsSchema>;
export type FaqQuery = z.infer<typeof FaqQuerySchema>;

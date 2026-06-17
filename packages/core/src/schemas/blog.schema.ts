import { z } from 'zod';

// Published enum
export const PublishedSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// Blog schemas
export const CreateBlogSchema = z.object({
  slug: z.string().min(1).max(255).optional(),
  title: z.string().min(1).max(255),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(1),
  coverImage: z.url(),
  readTime: z.string().default('5 min read'),
  featured: z.boolean().default(false),
  status: PublishedSchema.default('DRAFT'),
  publishedAt: z.iso.datetime().optional(),
  categoryId: z.uuid(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const UpdateBlogSchema = CreateBlogSchema.partial();

export const BlogParamsSchema = z.object({
  id: z.uuid(),
});

export const BlogSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const BlogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: PublishedSchema.optional(),
  categoryId: z.uuid().optional(),
  featured: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

// Inferred types
export type Published = z.infer<typeof PublishedSchema>;
export type CreateBlog = z.infer<typeof CreateBlogSchema>;
export type UpdateBlog = z.infer<typeof UpdateBlogSchema>;
export type BlogParams = z.infer<typeof BlogParamsSchema>;
export type BlogSlugParams = z.infer<typeof BlogSlugParamsSchema>;
export type BlogQuery = z.infer<typeof BlogQuerySchema>;

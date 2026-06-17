import { z } from 'zod';
import { PublishedSchema } from './blog.schema';

const QueryBooleanSchema = z
  .unknown()
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return value;
  })
  .pipe(z.boolean());

export const SpotlightLinksSchema = z.object({
  twitterUrl: z.url().optional(),
  instagramUrl: z.url().optional(),
});

export const CreateSpotlightSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must be lowercase with hyphens only',
      }),
    name: z.string().min(1).max(120),
    username: z.string().max(120).optional(),
    imageUrl: z.url(),
    videoUrl: z.url().optional(),
    tagline: z.string().min(1).max(280),
    story: z.string().min(1).max(10000),
    achievements: z.array(z.string().min(1).max(140)).default([]),
    sport: z.string().min(1).max(80),
    memberSince: z.iso.datetime().optional(),
    quote: z.string().max(500).optional(),
    reviewNotes: z.string().max(1000).optional(),
    featured: z.boolean().default(false),
    status: PublishedSchema.default('DRAFT'),
    isActive: z.boolean().default(true),
    publishedAt: z.iso.datetime().optional(),
  })
  .extend(SpotlightLinksSchema.shape);

export const SubmitSpotlightSchema = CreateSpotlightSchema.omit({
  slug: true,
  name: true,
  username: true,
  memberSince: true,
  twitterUrl: true,
  instagramUrl: true,
  featured: true,
  status: true,
  isActive: true,
  publishedAt: true,
});

export const UpdateSpotlightSchema = CreateSpotlightSchema.partial();

export const SpotlightParamsSchema = z.object({
  id: z.uuid(),
});

export const SpotlightSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const SpotlightQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: PublishedSchema.optional(),
  isActive: QueryBooleanSchema.optional(),
  featured: QueryBooleanSchema.optional(),
  submitterEmail: z.email().optional(),
});

export const PublicSpotlightQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export type SpotlightLinks = z.infer<typeof SpotlightLinksSchema>;
export type CreateSpotlight = z.infer<typeof CreateSpotlightSchema>;
export type SubmitSpotlight = z.infer<typeof SubmitSpotlightSchema>;
export type UpdateSpotlight = z.infer<typeof UpdateSpotlightSchema>;
export type SpotlightParams = z.infer<typeof SpotlightParamsSchema>;
export type SpotlightSlugParams = z.infer<typeof SpotlightSlugParamsSchema>;
export type SpotlightQuery = z.infer<typeof SpotlightQuerySchema>;
export type PublicSpotlightQuery = z.infer<typeof PublicSpotlightQuerySchema>;

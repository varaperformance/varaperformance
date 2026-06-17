import { z } from 'zod';

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CLIMB_CATEGORIES = [
  'DAILY',
  'FACE',
  'ABS',
  'BACK',
  'LEGS',
  'GLUTES',
  'ARMS',
  'CHEST',
  'SHOULDERS',
] as const;

export const ClimbCategorySchema = z.enum(CLIMB_CATEGORIES);

export const CreateClimbEntrySchema = z.object({
  category: ClimbCategorySchema.default('DAILY'),
  imageUrl: z.url(),
  note: z.string().max(280).optional(),
  capturedDate: DateOnlySchema.optional(),
});

export const ClimbEntriesQuerySchema = z.object({
  category: ClimbCategorySchema.optional(),
  fromDate: DateOnlySchema.optional(),
  toDate: DateOnlySchema.optional(),
  limit: z.coerce.number().int().positive().max(365).default(180),
});

export type ClimbCategory = z.infer<typeof ClimbCategorySchema>;
export type CreateClimbEntry = z.infer<typeof CreateClimbEntrySchema>;
export type ClimbEntriesQuery = z.infer<typeof ClimbEntriesQuerySchema>;

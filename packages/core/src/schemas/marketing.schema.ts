import { z } from 'zod';

export const NewsletterStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'FAILED',
]);

export const CreateNewsletterSchema = z.object({
  subject: z.string().min(1).max(255),
  content: z.string().min(1),
  scheduledAt: z.iso.datetime().optional(),
});

export const UpdateNewsletterSchema = CreateNewsletterSchema.partial();

export const NewsletterQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: NewsletterStatusSchema.optional(),
});

export const SubscriberQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export type NewsletterStatus = z.infer<typeof NewsletterStatusSchema>;
export type CreateNewsletter = z.infer<typeof CreateNewsletterSchema>;
export type UpdateNewsletter = z.infer<typeof UpdateNewsletterSchema>;
export type NewsletterQuery = z.infer<typeof NewsletterQuerySchema>;
export type SubscriberQuery = z.infer<typeof SubscriberQuerySchema>;

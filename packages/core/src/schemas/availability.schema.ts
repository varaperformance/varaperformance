import { z } from 'zod';
import { DayOfWeekSchema } from './workout-plan.schema';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// Create availability slot
export const CreateAvailabilitySchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  startTime: z.string().regex(timeRegex, 'Must be HH:mm format'),
  endTime: z.string().regex(timeRegex, 'Must be HH:mm format'),
  timezone: z.string().max(50).default('America/Chicago'),
});

// Update availability slot
export const UpdateAvailabilitySchema = z.object({
  startTime: z.string().regex(timeRegex, 'Must be HH:mm format').optional(),
  endTime: z.string().regex(timeRegex, 'Must be HH:mm format').optional(),
  timezone: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

// Params
export const AvailabilityParamsSchema = z.object({
  id: z.uuid(),
});

// Query availability for a coach (public)
export const AvailabilityQuerySchema = z.object({
  coachId: z.uuid(),
});

// Response type
export interface AvailabilitySlotResponse {
  id: string;
  dayOfWeek: z.infer<typeof DayOfWeekSchema>;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
}

// Inferred types
export type CreateAvailability = z.infer<typeof CreateAvailabilitySchema>;
export type UpdateAvailability = z.infer<typeof UpdateAvailabilitySchema>;
export type AvailabilityParams = z.infer<typeof AvailabilityParamsSchema>;
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

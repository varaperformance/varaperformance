import { z } from 'zod';

export const CalendarEventTypeSchema = z.enum(['EVENT', 'MEETING']);
export const CalendarEventVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);
export const RecurrenceFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);

export const CalendarRangeQuerySchema = z
  .object({
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.start).getTime() >= new Date(value.end).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'start must be before end',
        path: ['start'],
      });
    }
  });

export const EventIdParamsSchema = z.object({
  eventId: z.uuid(),
});

export const CalendarUserParamsSchema = z.object({
  userId: z.uuid(),
});

export const RecurrenceRuleSchema = z.object({
  frequency: RecurrenceFrequencySchema,
  interval: z.coerce.number().int().min(1).max(52).default(1),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  until: z.iso.datetime().optional(),
  count: z.coerce.number().int().min(1).max(730).optional(),
});

const CalendarEventPayloadBaseSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(4000).optional(),
  location: z.string().max(240).optional(),
  type: CalendarEventTypeSchema.default('EVENT'),
  visibility: CalendarEventVisibilitySchema.default('PUBLIC'),
  allDay: z.boolean().default(false),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  timezone: z.string().max(64).default('UTC'),
  participantUserId: z.uuid().optional(),
  recurrence: RecurrenceRuleSchema.optional(),
});

export const CreateCalendarEventSchema =
  CalendarEventPayloadBaseSchema.superRefine((value, ctx) => {
    if (new Date(value.startAt).getTime() >= new Date(value.endAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startAt must be before endAt',
        path: ['startAt'],
      });
    }
  });

export const UpdateCalendarEventSchema =
  CalendarEventPayloadBaseSchema.partial();

export const CalendarOccurrenceSchema = z.object({
  id: z.string(),
  eventId: z.uuid(),
  ownerUserId: z.uuid(),
  participantUserId: z.uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  type: CalendarEventTypeSchema,
  visibility: CalendarEventVisibilitySchema,
  allDay: z.boolean(),
  isPrivateMasked: z.boolean(),
  isRecurring: z.boolean(),
  occurrenceStart: z.iso.datetime(),
  occurrenceEnd: z.iso.datetime(),
  timezone: z.string(),
});

export type CalendarEventType = z.infer<typeof CalendarEventTypeSchema>;
export type CalendarEventVisibility = z.infer<
  typeof CalendarEventVisibilitySchema
>;
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>;
export type CalendarRangeQuery = z.infer<typeof CalendarRangeQuerySchema>;
export type EventIdParams = z.infer<typeof EventIdParamsSchema>;
export type CalendarUserParams = z.infer<typeof CalendarUserParamsSchema>;
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;
export type CreateCalendarEvent = z.infer<typeof CreateCalendarEventSchema>;
export type UpdateCalendarEvent = z.infer<typeof UpdateCalendarEventSchema>;
export type CalendarOccurrence = z.infer<typeof CalendarOccurrenceSchema>;

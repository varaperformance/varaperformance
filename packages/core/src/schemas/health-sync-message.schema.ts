import { z } from 'zod';

export const HealthSyncTriggerSchema = z.enum([
  'scheduled',
  'manual',
  'backfill',
]);

export type HealthSyncTrigger = z.infer<typeof HealthSyncTriggerSchema>;

export const HealthSyncMessageSchema = z.object({
  provider: z.string().min(1),
  userId: z.string().uuid().optional(),
  trigger: HealthSyncTriggerSchema,
  maxUsers: z.number().int().positive().optional(),
  timestamp: z.string(),
  idempotencyKey: z.string().optional(),
});

export type HealthSyncMessage = z.infer<typeof HealthSyncMessageSchema>;

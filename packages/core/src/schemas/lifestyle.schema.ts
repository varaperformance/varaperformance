import { z } from 'zod';

export const LifestyleGoalDataSchema = z.object({
  sleepHours: z.number().min(4).max(12).default(8),
  dailySteps: z.number().int().min(1000).max(50000).default(10000),
  adherenceTarget: z.number().int().min(50).max(100).default(85),
  checkInsPerWeek: z.number().int().min(1).max(14).default(4),
});

export const UpdateLifestyleGoalSchema = LifestyleGoalDataSchema.partial();

export type LifestyleGoalData = z.infer<typeof LifestyleGoalDataSchema>;
export type UpdateLifestyleGoal = z.infer<typeof UpdateLifestyleGoalSchema>;

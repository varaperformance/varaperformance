import { z } from 'zod';

// Volume unit enum
export const VolumeUnitSchema = z.enum(['OZ', 'ML', 'L', 'CUPS']);

// Water log data
export const WaterLogDataSchema = z.object({
  amount: z.number().positive(),
  unit: VolumeUnitSchema,
});

// Create water log
export const CreateWaterLogSchema = WaterLogDataSchema;

// Water goal
export const WaterGoalDataSchema = z.object({
  targetAmount: z.number().positive().default(64),
  targetUnit: VolumeUnitSchema.default('OZ'),
});

// Update water goal
export const UpdateWaterGoalSchema = WaterGoalDataSchema.partial();

// Query for water logs
export const WaterLogQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // Defaults to today
});

// Params
export const WaterLogParamsSchema = z.object({
  id: z.uuid(),
});

// Inferred types
export type VolumeUnit = z.infer<typeof VolumeUnitSchema>;
export type WaterLogData = z.infer<typeof WaterLogDataSchema>;
export type CreateWaterLog = z.infer<typeof CreateWaterLogSchema>;
export type WaterGoalData = z.infer<typeof WaterGoalDataSchema>;
export type UpdateWaterGoal = z.infer<typeof UpdateWaterGoalSchema>;
export type WaterLogQuery = z.infer<typeof WaterLogQuerySchema>;
export type WaterLogParams = z.infer<typeof WaterLogParamsSchema>;

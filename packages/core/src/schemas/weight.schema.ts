import { z } from 'zod';
import { WorkoutSessionSourceSchema } from './workout.schema';

// Weight unit enum
export const WeightUnitSchema = z.enum(['OZ', 'LB', 'G', 'KG']);

// Goal type enum
export const WeightGoalTypeSchema = z.enum(['LOSE', 'GAIN', 'MAINTAIN']);

// Weight log data
export const WeightLogDataSchema = z.object({
  value: z.number().positive().max(1500), // Max 1500 lbs/kg
  unit: WeightUnitSchema,
  bodyFat: z.number().min(1).max(70).optional(), // Body fat percentage 1-70%
  muscleMass: z.number().positive().max(500).optional(), // Muscle mass in same unit as weight
  note: z.string().max(255).optional(),
  /** When the measurement was taken (e.g. imports). Defaults to now. */
  loggedAt: z.iso.datetime().optional(),
});

// Create weight log
export const CreateWeightLogSchema = WeightLogDataSchema.extend({
  source: WorkoutSessionSourceSchema.optional(),
});

// Weight goal data
export const WeightGoalDataSchema = z.object({
  targetWeight: z.number().positive().max(1500),
  targetUnit: WeightUnitSchema,
  goalType: WeightGoalTypeSchema,
  weeklyRate: z.number().min(0).max(2).default(1), // 0-2 lbs per week
});

// Update weight goal (partial)
export const UpdateWeightGoalSchema = WeightGoalDataSchema.partial();

// Query for listing weight logs
export const WeightLogQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().positive().max(365).default(30),
});

// Params
export const WeightLogParamsSchema = z.object({
  id: z.uuid(),
});

// Inferred types
export type WeightUnit = z.infer<typeof WeightUnitSchema>;
export type WeightGoalType = z.infer<typeof WeightGoalTypeSchema>;
export type WeightLogData = z.infer<typeof WeightLogDataSchema>;
export type CreateWeightLog = z.infer<typeof CreateWeightLogSchema>;
export type WeightGoalData = z.infer<typeof WeightGoalDataSchema>;
export type UpdateWeightGoal = z.infer<typeof UpdateWeightGoalSchema>;
export type WeightLogQuery = z.infer<typeof WeightLogQuerySchema>;
export type WeightLogParams = z.infer<typeof WeightLogParamsSchema>;

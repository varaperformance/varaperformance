import { z } from 'zod';

// Measurement unit enum
export const MeasurementUnitSchema = z.enum(['IN', 'CM']);

// Individual measurement value (optional per body part)
const optionalMeasurement = z.number().positive().max(200).optional();

// Create body measurement entry
export const CreateBodyMeasurementSchema = z.object({
  unit: MeasurementUnitSchema,
  neck: optionalMeasurement,
  shoulders: optionalMeasurement,
  chest: optionalMeasurement,
  leftBicep: optionalMeasurement,
  rightBicep: optionalMeasurement,
  waist: optionalMeasurement,
  hips: optionalMeasurement,
  leftThigh: optionalMeasurement,
  rightThigh: optionalMeasurement,
  leftCalf: optionalMeasurement,
  rightCalf: optionalMeasurement,
  note: z.string().max(255).optional(),
});

// Query params for listing measurements
export const BodyMeasurementQuerySchema = z.object({
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
export const BodyMeasurementParamsSchema = z.object({
  id: z.uuid(),
});

// Inferred types
export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;
export type CreateBodyMeasurement = z.infer<typeof CreateBodyMeasurementSchema>;
export type BodyMeasurementQuery = z.infer<typeof BodyMeasurementQuerySchema>;
export type BodyMeasurementParams = z.infer<typeof BodyMeasurementParamsSchema>;

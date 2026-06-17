import { z } from 'zod';

// Time slot enum
export const TimeSlotSchema = z.enum(['MORNING', 'AFTERNOON', 'EVENING']);

// Stack item data
export const StackItemDataSchema = z.object({
  name: z.string().min(1).max(100),
  dosage: z.string().min(1).max(50),
  timeSlot: TimeSlotSchema.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// Create stack
export const CreateStackSchema = z.object({
  name: z.string().min(1).max(100),
  items: z.array(StackItemDataSchema).optional(),
});

// Update stack
export const UpdateStackSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// Add item to stack
export const AddStackItemSchema = StackItemDataSchema;

// Update item in stack
export const UpdateStackItemSchema = StackItemDataSchema.partial();

// Batch update items (for reordering/scheduling)
export const BatchUpdateItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      timeSlot: TimeSlotSchema.nullable(),
    }),
  ),
});

// Log supplement intake
export const LogIntakeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  taken: z.boolean(),
});

// Params
export const StackParamsSchema = z.object({
  id: z.uuid(),
});

export const StackItemParamsSchema = z.object({
  stackId: z.uuid(),
  itemId: z.uuid(),
});

// Query for logs
export const StackLogsQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// Inferred types
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type StackItemData = z.infer<typeof StackItemDataSchema>;
export type CreateStack = z.infer<typeof CreateStackSchema>;
export type UpdateStack = z.infer<typeof UpdateStackSchema>;
export type AddStackItem = z.infer<typeof AddStackItemSchema>;
export type UpdateStackItem = z.infer<typeof UpdateStackItemSchema>;
export type BatchUpdateItems = z.infer<typeof BatchUpdateItemsSchema>;
export type LogIntake = z.infer<typeof LogIntakeSchema>;
export type StackParams = z.infer<typeof StackParamsSchema>;
export type StackItemParams = z.infer<typeof StackItemParamsSchema>;
export type StackLogsQuery = z.infer<typeof StackLogsQuerySchema>;

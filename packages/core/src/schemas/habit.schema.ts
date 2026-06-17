import { z } from 'zod';

export const HabitLinkedModuleSchema = z.enum(['STACK', 'CLIMB', 'INJECTION']);
export type HabitLinkedModule = z.infer<typeof HabitLinkedModuleSchema>;

// Create habit
export const CreateHabitSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).default('circle-check'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#6366f1'),
  linkedModule: HabitLinkedModuleSchema.optional(),
});

// Update habit
export const UpdateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  linkedModule: HabitLinkedModuleSchema.nullable().optional(),
});

// Log a habit completion for a date
export const LogHabitSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // Defaults to today
});

// Query habits
export const HabitQuerySchema = z.object({
  includeInactive: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

// Query habit logs (heatmap data)
export const HabitLogQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Params
export const HabitParamsSchema = z.object({
  id: z.uuid(),
});

// Response types
export interface HabitResponse {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  linkedModule: 'STACK' | 'CLIMB' | 'INJECTION' | null;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  createdAt: string;
}

export interface HabitLogResponse {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  createdAt: string;
}

export interface HabitHeatmapEntry {
  date: string;
  count: number; // number of habits completed that day
}

// Inferred types
export type CreateHabit = z.infer<typeof CreateHabitSchema>;
export type UpdateHabit = z.infer<typeof UpdateHabitSchema>;
export type LogHabit = z.infer<typeof LogHabitSchema>;
export type HabitQuery = z.infer<typeof HabitQuerySchema>;
export type HabitLogQuery = z.infer<typeof HabitLogQuerySchema>;
export type HabitParams = z.infer<typeof HabitParamsSchema>;

import { createZodDto } from 'nestjs-zod';
import {
  CreateWorkoutPlanSchema,
  UpdateWorkoutPlanSchema,
  CreateWorkoutPlanDaySchema,
  UpdateWorkoutPlanDaySchema,
  CreateWorkoutPlanExerciseSchema,
  UpdateWorkoutPlanExerciseSchema,
  CreateExerciseSetSchema,
  UpdateExerciseSetSchema,
  AssignWorkoutPlanSchema,
  UpdateAssignmentStatusSchema,
  WorkoutPlanQuerySchema,
  WorkoutPlanAssignmentQuerySchema,
  StartPlanWorkoutSchema,
  CompletePlanDaySchema,
} from '@varaperformance/core';
import { z } from 'zod';

// Plan DTOs
export class CreateWorkoutPlanDto extends createZodDto(
  CreateWorkoutPlanSchema,
) {}
export class UpdateWorkoutPlanDto extends createZodDto(
  UpdateWorkoutPlanSchema,
) {}
export class WorkoutPlanQueryDto extends createZodDto(WorkoutPlanQuerySchema) {}

// Day DTOs
export class CreateWorkoutPlanDayDto extends createZodDto(
  CreateWorkoutPlanDaySchema,
) {}
export class UpdateWorkoutPlanDayDto extends createZodDto(
  UpdateWorkoutPlanDaySchema,
) {}

// Exercise DTOs
export class CreateWorkoutPlanExerciseDto extends createZodDto(
  CreateWorkoutPlanExerciseSchema,
) {}
export class UpdateWorkoutPlanExerciseDto extends createZodDto(
  UpdateWorkoutPlanExerciseSchema,
) {}

// Assignment DTOs
export class AssignWorkoutPlanDto extends createZodDto(
  AssignWorkoutPlanSchema,
) {}
export class UpdateAssignmentStatusDto extends createZodDto(
  UpdateAssignmentStatusSchema,
) {}
export class WorkoutPlanAssignmentQueryDto extends createZodDto(
  WorkoutPlanAssignmentQuerySchema,
) {}

// Workout DTOs
export class StartPlanWorkoutDto extends createZodDto(StartPlanWorkoutSchema) {}
export class CompletePlanDayDto extends createZodDto(CompletePlanDaySchema) {}

// Param DTOs
export class PlanParamsDto extends createZodDto(
  z.object({
    planId: z.string().uuid(),
  }),
) {}

export class DayParamsDto extends createZodDto(
  z.object({
    planId: z.string().uuid(),
    dayId: z.string().uuid(),
  }),
) {}

export class ExerciseParamsDto extends createZodDto(
  z.object({
    planId: z.string().uuid(),
    dayId: z.string().uuid(),
    exerciseId: z.string().uuid(),
  }),
) {}

export class AssignmentParamsDto extends createZodDto(
  z.object({
    assignmentId: z.string().uuid(),
  }),
) {}

// Exercise Set DTOs
export class CreateExerciseSetDto extends createZodDto(
  CreateExerciseSetSchema,
) {}
export class UpdateExerciseSetDto extends createZodDto(
  UpdateExerciseSetSchema,
) {}

export class SetParamsDto extends createZodDto(
  z.object({
    planId: z.string().uuid(),
    dayId: z.string().uuid(),
    exerciseId: z.string().uuid(),
    setId: z.string().uuid(),
  }),
) {}

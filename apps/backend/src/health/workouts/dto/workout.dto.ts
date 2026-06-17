import { createZodDto } from 'nestjs-zod';
import {
  CreateWorkoutSessionSchema,
  UpdateWorkoutSessionSchema,
  CreateWorkoutSchema,
  AddWorkoutSetSchema,
  UpdateWorkoutSetSchema,
  WorkoutSessionQuerySchema,
  WorkoutSessionParamsSchema,
  WorkoutParamsSchema,
  WorkoutSetParamsSchema,
  UpsertWorkoutGoalSchema,
  StartSessionSchema,
  EndSessionSchema,
  AddWorkoutToSessionSchema,
  UpdateWorkoutInSessionSchema,
} from '@varaperformance/core';

// Session DTOs
export class CreateWorkoutSessionDto extends createZodDto(
  CreateWorkoutSessionSchema,
) {}

export class UpdateWorkoutSessionDto extends createZodDto(
  UpdateWorkoutSessionSchema,
) {}

export class WorkoutSessionQueryDto extends createZodDto(
  WorkoutSessionQuerySchema,
) {}

export class WorkoutSessionParamsDto extends createZodDto(
  WorkoutSessionParamsSchema,
) {}

// NEW: Active Session DTOs
export class StartSessionDto extends createZodDto(StartSessionSchema) {}

export class EndSessionDto extends createZodDto(EndSessionSchema) {}

export class AddWorkoutToSessionDto extends createZodDto(
  AddWorkoutToSessionSchema,
) {}

export class UpdateWorkoutInSessionDto extends createZodDto(
  UpdateWorkoutInSessionSchema,
) {}

// Workout DTOs (within session)
export class CreateWorkoutDto extends createZodDto(CreateWorkoutSchema) {}

export class WorkoutParamsDto extends createZodDto(WorkoutParamsSchema) {}

// Set DTOs
export class AddWorkoutSetDto extends createZodDto(AddWorkoutSetSchema) {}

export class UpdateWorkoutSetDto extends createZodDto(UpdateWorkoutSetSchema) {}

export class WorkoutSetParamsDto extends createZodDto(WorkoutSetParamsSchema) {}

// Workout Goal DTOs
export class UpsertWorkoutGoalDto extends createZodDto(
  UpsertWorkoutGoalSchema,
) {}

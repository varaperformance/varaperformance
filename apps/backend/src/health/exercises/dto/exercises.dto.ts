import { createZodDto } from 'nestjs-zod';
import {
  ExerciseQuerySchema,
  ExerciseParamsSchema,
  ExerciseIdParamsSchema,
  CreateExerciseSchema,
  UpdateExerciseSchema,
} from '@varaperformance/core';

export class ExerciseQueryDto extends createZodDto(ExerciseQuerySchema) {}
export class ExerciseParamsDto extends createZodDto(ExerciseParamsSchema) {}
export class ExerciseIdParamsDto extends createZodDto(ExerciseIdParamsSchema) {}
export class CreateExerciseDto extends createZodDto(CreateExerciseSchema) {}
export class UpdateExerciseDto extends createZodDto(UpdateExerciseSchema) {}

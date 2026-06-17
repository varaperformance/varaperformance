import { createZodDto } from 'nestjs-zod';
import {
  CreateGymSchema,
  UpdateGymSchema,
  GymParamsSchema,
  GymQuerySchema,
  CreateGymLocationSchema,
  UpdateGymLocationSchema,
  GymLocationParamsSchema,
  GymLocationQuerySchema,
} from '@varaperformance/core';

// Gym DTOs
export class CreateGymDto extends createZodDto(CreateGymSchema) {}

export class UpdateGymDto extends createZodDto(UpdateGymSchema) {}

export class GymParamsDto extends createZodDto(GymParamsSchema) {}

export class GymQueryDto extends createZodDto(GymQuerySchema) {}

// GymLocation DTOs
export class CreateGymLocationDto extends createZodDto(
  CreateGymLocationSchema,
) {}

export class UpdateGymLocationDto extends createZodDto(
  UpdateGymLocationSchema,
) {}

export class GymLocationParamsDto extends createZodDto(
  GymLocationParamsSchema,
) {}

export class GymLocationQueryDto extends createZodDto(GymLocationQuerySchema) {}

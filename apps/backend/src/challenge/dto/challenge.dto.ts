import { createZodDto } from 'nestjs-zod';
import {
  CreateChallengeSchema,
  UpdateChallengeSchema,
  AdminUpdateChallengeSchema,
  UpdateChallengeProgressSchema,
  ChallengeQuerySchema,
} from '@varaperformance/core';

export class CreateChallengeDto extends createZodDto(CreateChallengeSchema) {}
export class UpdateChallengeDto extends createZodDto(UpdateChallengeSchema) {}
export class AdminUpdateChallengeDto extends createZodDto(
  AdminUpdateChallengeSchema,
) {}
export class UpdateChallengeProgressDto extends createZodDto(
  UpdateChallengeProgressSchema,
) {}
export class ChallengeQueryDto extends createZodDto(ChallengeQuerySchema) {}

import { createZodDto } from 'nestjs-zod';
import {
  CoachContractIdParamsSchema,
  CoachContractParamsSchema,
  CoachContractQuerySchema,
  CreateCoachContractSchema,
  CreateCoachContractVersionSchema,
} from '@varaperformance/core';

/**
 * Coach Contract DTOs
 * WORM (Write Once Read Many) compliant contract management
 */

// Params DTOs
export class CoachContractIdParamsDto extends createZodDto(
  CoachContractIdParamsSchema,
) {}

export class CoachContractParamsDto extends createZodDto(
  CoachContractParamsSchema,
) {}

// Query DTOs
export class CoachContractQueryDto extends createZodDto(
  CoachContractQuerySchema,
) {}

// Body DTOs
export class CreateCoachContractDto extends createZodDto(
  CreateCoachContractSchema,
) {}

export class CreateCoachContractVersionDto extends createZodDto(
  CreateCoachContractVersionSchema,
) {}

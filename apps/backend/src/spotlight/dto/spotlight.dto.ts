import { createZodDto } from 'nestjs-zod';
import {
  CreateSpotlightSchema,
  SubmitSpotlightSchema,
  UpdateSpotlightSchema,
  SpotlightQuerySchema,
  PublicSpotlightQuerySchema,
} from '@varaperformance/core';

export class CreateSpotlightDto extends createZodDto(CreateSpotlightSchema) {}

export class SubmitSpotlightDto extends createZodDto(SubmitSpotlightSchema) {}

export class UpdateSpotlightDto extends createZodDto(UpdateSpotlightSchema) {}

export class SpotlightQueryDto extends createZodDto(SpotlightQuerySchema) {}

export class PublicSpotlightQueryDto extends createZodDto(
  PublicSpotlightQuerySchema,
) {}

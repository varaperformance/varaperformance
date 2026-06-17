import { createZodDto } from 'nestjs-zod';
import {
  CreateSocialsSchema,
  UpdateSocialsSchema,
} from '@varaperformance/core';

export class CreateSocialsDto extends createZodDto(CreateSocialsSchema) {}

export class UpdateSocialsDto extends createZodDto(UpdateSocialsSchema) {}

import { createZodDto } from 'nestjs-zod';
import {
  ApplyAmbassadorSchema,
  CreateTeamMemberSchema,
  UpdateTeamMemberSchema,
} from '@varaperformance/core';

export class ApplyAmbassadorDto extends createZodDto(ApplyAmbassadorSchema) {}

export class CreateTeamMemberDto extends createZodDto(CreateTeamMemberSchema) {}

export class UpdateTeamMemberDto extends createZodDto(UpdateTeamMemberSchema) {}

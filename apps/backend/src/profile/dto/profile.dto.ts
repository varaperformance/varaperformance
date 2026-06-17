import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  PartialProfileSchema,
  UpdateProfileSchema,
  AssociateGymsFromPlacesSchema,
  CreateProfileAddressSchema,
  UpdateProfileAddressSchema,
  ProfileAddressIdParamsSchema,
} from '@varaperformance/core';

export class SaveProfileDto extends createZodDto(PartialProfileSchema) {}

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}

export class CheckDisplayNameDto extends createZodDto(
  z.object({
    displayName: z.string().min(1).max(50),
  }),
) {}

export class AssociateGymsDto extends createZodDto(
  AssociateGymsFromPlacesSchema,
) {}

export class CreateProfileAddressDto extends createZodDto(
  CreateProfileAddressSchema,
) {}

export class UpdateProfileAddressDto extends createZodDto(
  UpdateProfileAddressSchema,
) {}

export class ProfileAddressIdParamDto extends createZodDto(
  ProfileAddressIdParamsSchema,
) {}

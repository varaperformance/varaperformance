import { createZodDto } from 'nestjs-zod';
import {
  CoachQuerySchema,
  CoachParamsSchema,
  ApplyCoachApplicationSchema,
  CreateCoachPackageSchema,
  UpdateCoachPackageSchema,
  CreateBookingSchema,
  SignContractSchema,
  UpdateBookingStatusSchema,
  CreateCoachReviewSchema,
  UpdateCoachReviewSchema,
} from '@varaperformance/core';
import { z } from 'zod';

// Query DTOs
export class CoachQueryDto extends createZodDto(CoachQuerySchema) {}

export class CoachParamsDto extends createZodDto(CoachParamsSchema) {}

export class ApplyCoachDto extends createZodDto(ApplyCoachApplicationSchema) {}

// Package DTOs
export class CreateCoachPackageDto extends createZodDto(
  CreateCoachPackageSchema,
) {}

export class UpdateCoachPackageDto extends createZodDto(
  UpdateCoachPackageSchema,
) {}

export class PackageParamsDto extends createZodDto(
  z.object({
    id: z.string().uuid(),
    packageId: z.string().uuid(),
  }),
) {}

// Booking DTOs
export class CreateBookingDto extends createZodDto(CreateBookingSchema) {}

export class SignContractDto extends createZodDto(SignContractSchema) {}

export class BookingParamsDto extends createZodDto(
  z.object({
    id: z.string().uuid(),
  }),
) {}

// Review DTOs
export class CreateCoachReviewDto extends createZodDto(
  CreateCoachReviewSchema,
) {}

export class UpdateCoachReviewDto extends createZodDto(
  UpdateCoachReviewSchema,
) {}

export class ReviewParamsDto extends createZodDto(
  z.object({
    id: z.string().uuid(),
    reviewId: z.string().uuid().optional(),
  }),
) {}

// Booking status DTOs
export class UpdateBookingStatusDto extends createZodDto(
  UpdateBookingStatusSchema,
) {}

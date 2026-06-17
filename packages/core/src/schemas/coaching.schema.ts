import { z } from 'zod';

// Import shared schemas from payment (already exported via schemas/index.ts)
import {
  BillingCycleSchema,
  BookingStatusSchema,
  SubscriptionStatusSchema,
} from './payment.schema';

// Coach specialty enum - unique to coaching
export const CoachSpecialtySchema = z.enum([
  'STRENGTH',
  'BODYBUILDING',
  'POWERLIFTING',
  'CROSSFIT',
  'NUTRITION',
  'MOBILITY',
  'ENDURANCE',
]);

export const CoachDesignationSchema = z.enum(['CERTIFIED', 'INFLUENCER']);

// Query schema for filtering coaches
export const CoachQuerySchema = z.object({
  specialty: CoachSpecialtySchema.optional(),
  available: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  designation: CoachDesignationSchema.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  sortBy: z
    .enum(['rating', 'reviewCount', 'clientCount', 'createdAt'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Params for single coach lookup
export const CoachParamsSchema = z.object({
  id: z.uuid(),
});

// Create coach package schema
export const CreateCoachPackageSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  priceInCents: z.number().int().positive().max(10000000), // Max $100,000
  billingCycle: BillingCycleSchema,
  features: z.array(z.string().max(200)).max(20),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const UpdateCoachPackageSchema = CreateCoachPackageSchema.partial();

export const CoachCertificationSchema = z
  .object({
    name: z.string().min(1).max(120),
    lookupUrl: z.url().optional(),
    photoUrl: z.string().min(1).max(10000).optional(),
    certId: z.string().min(1).max(120).optional(),
  })
  .superRefine((value, ctx) => {
    const provided = [value.lookupUrl, value.photoUrl, value.certId].filter(
      (item) => typeof item === 'string' && item.trim().length > 0,
    ).length;

    if (provided < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Each certification must include at least 2 of: lookup link, photo upload, cert id',
      });
    }
  });

// Authenticated coach application submission
export const ApplyCoachApplicationSchema = z
  .object({
    designation: CoachDesignationSchema.default('CERTIFIED'),
    title: z.string().min(1).max(120),
    bio: z.string().min(40).max(3000),
    location: z.string().min(1).max(120),
    experienceYears: z.coerce.number().int().min(0).max(80),
    certifications: z.array(CoachCertificationSchema).max(20).default([]),
    influencerSocialLinks: z.array(z.url().max(500)).max(20).default([]),
    specialties: z.array(CoachSpecialtySchema).min(1).max(5),
  })
  .superRefine((value, ctx) => {
    if (
      value.designation === 'CERTIFIED' &&
      value.certifications.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['certifications'],
        message: 'Certified coaches must provide at least one certification',
      });
    }

    if (
      value.designation === 'INFLUENCER' &&
      value.influencerSocialLinks.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['influencerSocialLinks'],
        message: 'Influencers must provide at least one social media link',
      });
    }
  });

// Create booking schema (intake form)
export const CreateBookingSchema = z.object({
  coachId: z.uuid(),
  packageId: z.uuid(),
  intake: z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.email(),
    phone: z.string().max(20).optional(),
    goals: z.string().max(2000),
    experience: z.enum(['beginner', 'intermediate', 'advanced', 'elite']),
    injuries: z.string().max(2000).optional(),
  }),
});

// Contract signature schema
export const SignContractSchema = z.object({
  bookingId: z.uuid(),
  contractId: z.uuid(),
  signature: z.string().min(2).max(100), // Full legal name
});

// Booking status update schema (coach-only actions)
export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['APPROVED', 'COMPLETED', 'CANCELLED']),
});

// Coach review schema
export const CreateCoachReviewSchema = z.object({
  coachId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  content: z.string().max(2000).optional(),
});

export const UpdateCoachReviewSchema = CreateCoachReviewSchema.partial().omit({
  coachId: true,
});

// =============================================================================
// Coach Contract Schemas
// WORM (Write Once Read Many) compliant contract management
// =============================================================================

// Version type for semantic versioning
export const ContractVersionTypeSchema = z.enum(['major', 'minor', 'patch']);

// Contract ID params
export const CoachContractIdParamsSchema = z.object({
  id: z.string().uuid('Invalid contract ID'),
});

// Coach-specific contract ID params (for coach's contracts)
export const CoachContractParamsSchema = z.object({
  coachId: z.string().uuid('Invalid coach ID'),
});

// Query parameters for listing contracts
export const CoachContractQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  coachId: z.uuid().optional(),
  activeOnly: z.coerce.boolean().default(false),
});

// Create a new contract for a coach
export const CreateCoachContractSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  effectiveAt: z.iso.datetime().optional(),
});

// Create a new version of an existing contract (WORM compliant)
export const CreateCoachContractVersionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1, 'Content is required'),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  effectiveAt: z.iso.datetime().optional(),
  versionType: ContractVersionTypeSchema.default('patch'),
});

// Contract response
export const CoachContractResponseSchema = z.object({
  id: z.uuid(),
  coachId: z.uuid(),
  version: z.string(),
  title: z.string(),
  content: z.string(),
  hashValue: z.string().nullable(),
  cancellationPolicy: z.string().nullable(),
  refundPolicy: z.string().nullable(),
  effectiveAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Contract list item (without full content for performance)
export const CoachContractListItemSchema = z.object({
  id: z.uuid(),
  coachId: z.uuid(),
  version: z.string(),
  title: z.string(),
  hashValue: z.string().nullable(),
  effectiveAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Version history item
export const CoachContractVersionSchema = z.object({
  id: z.uuid(),
  version: z.string(),
  title: z.string(),
  hashValue: z.string().nullable(),
  effectiveAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
});

// Inferred types (BillingCycle, BookingStatus, SubscriptionStatus are re-exported above from payment.schema)
export type CoachSpecialty = z.infer<typeof CoachSpecialtySchema>;
export type CoachDesignation = z.infer<typeof CoachDesignationSchema>;
export type CoachQuery = z.infer<typeof CoachQuerySchema>;
export type CoachParams = z.infer<typeof CoachParamsSchema>;
export type CreateCoachPackage = z.infer<typeof CreateCoachPackageSchema>;
export type UpdateCoachPackage = z.infer<typeof UpdateCoachPackageSchema>;
export type CoachCertification = z.infer<typeof CoachCertificationSchema>;
export type ApplyCoachApplication = z.infer<typeof ApplyCoachApplicationSchema>;
export type CreateBooking = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingStatus = z.infer<typeof UpdateBookingStatusSchema>;
export type SignContract = z.infer<typeof SignContractSchema>;
export type CreateCoachReview = z.infer<typeof CreateCoachReviewSchema>;
export type UpdateCoachReview = z.infer<typeof UpdateCoachReviewSchema>;

// Contract types
export type ContractVersionType = z.infer<typeof ContractVersionTypeSchema>;
export type CoachContractIdParams = z.infer<typeof CoachContractIdParamsSchema>;
export type CoachContractParams = z.infer<typeof CoachContractParamsSchema>;
export type CoachContractQuery = z.infer<typeof CoachContractQuerySchema>;
export type CreateCoachContract = z.infer<typeof CreateCoachContractSchema>;
export type CreateCoachContractVersion = z.infer<
  typeof CreateCoachContractVersionSchema
>;
export type CoachContractResponse = z.infer<typeof CoachContractResponseSchema>;
export type CoachContractListItem = z.infer<typeof CoachContractListItemSchema>;
export type CoachContractVersion = z.infer<typeof CoachContractVersionSchema>;

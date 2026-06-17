import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ============================================
// Payment Method DTOs
// ============================================

export const SetDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string().uuid(),
});

export const RemovePaymentMethodSchema = z.object({
  paymentMethodId: z.string().uuid(),
});

export class SetDefaultPaymentMethodDto extends createZodDto(
  SetDefaultPaymentMethodSchema,
) {}

export class RemovePaymentMethodDto extends createZodDto(
  RemovePaymentMethodSchema,
) {}

// ============================================
// Payment DTOs
// ============================================

export const CreatePaymentSchema = z.object({
  amountInCents: z.number().int().positive(),
  currency: z.string().length(3).optional().default('usd'),
  description: z.string().max(500).optional(),
  paymentMethodId: z.string().optional(),
  bookingId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
});

export const PaymentIdParamsSchema = z.object({
  paymentId: z.string().uuid(),
});

export const PaymentHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export class CreatePaymentDto extends createZodDto(CreatePaymentSchema) {}
export class PaymentIdParamsDto extends createZodDto(PaymentIdParamsSchema) {}
export class PaymentHistoryQueryDto extends createZodDto(
  PaymentHistoryQuerySchema,
) {}

// ============================================
// Coaching Payment DTOs
// ============================================

// Use regex for UUID format validation (more permissive than z.string().uuid() which enforces RFC 4122)
const uuidFormat = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID',
  );

// Client intake form data (will be encrypted)
export const ClientIntakeSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  goals: z.string().max(2000).optional(),
  experience: z.string().max(2000).optional(),
  injuries: z.string().max(2000).optional(),
});

export type ClientIntake = z.infer<typeof ClientIntakeSchema>;

export const InitiateBookingPaymentSchema = z.object({
  coachId: uuidFormat,
  packageId: uuidFormat,
  paymentMethodId: z.string().optional(),
  intake: ClientIntakeSchema.optional(),
});

export const BookingIdParamsSchema = z.object({
  bookingId: z.string().uuid(),
});

export const CancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const RequestRefundSchema = z.object({
  reason: z.string().max(500).optional(),
});

export class InitiateBookingPaymentDto extends createZodDto(
  InitiateBookingPaymentSchema,
) {}
export class BookingIdParamsDto extends createZodDto(BookingIdParamsSchema) {}
export class CancelBookingDto extends createZodDto(CancelBookingSchema) {}
export class RequestRefundDto extends createZodDto(RequestRefundSchema) {}

// ============================================
// Subscription DTOs
// ============================================

export const SubscriptionIdParamsSchema = z.object({
  subscriptionId: z.string().uuid(),
});

export class SubscriptionIdParamsDto extends createZodDto(
  SubscriptionIdParamsSchema,
) {}

export const CreateStripeOnboardingLinkSchema = z.object({
  returnUrl: z.string().url().optional(),
  refreshUrl: z.string().url().optional(),
});

export class CreateStripeOnboardingLinkDto extends createZodDto(
  CreateStripeOnboardingLinkSchema,
) {}

// ============================================
// Pricing Plan + Platform Settings DTOs (Admin)
// ============================================

export const PricingPlanAudienceSchema = z.enum(['FREE', 'COACH', 'GYM']);

export const CreatePricingPlanSchema = z.object({
  slug: z.string().min(2).max(100),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  audience: PricingPlanAudienceSchema,
  priceInCents: z.number().int().min(0),
  periodLabel: z.string().max(40).optional(),
  cta: z.string().min(2).max(50),
  ctaLink: z.string().min(1).max(255),
  highlighted: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  features: z.array(z.string().min(1).max(200)).min(1),
});

export const UpdatePricingPlanSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  audience: PricingPlanAudienceSchema.optional(),
  priceInCents: z.number().int().min(0).optional(),
  periodLabel: z.string().max(40).optional(),
  cta: z.string().min(2).max(50).optional(),
  ctaLink: z.string().min(1).max(255).optional(),
  highlighted: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  features: z.array(z.string().min(1).max(200)).optional(),
});

export const PricingPlanIdParamsSchema = z.object({
  pricingPlanId: z.string().uuid(),
});

export const UpdatePlatformFeeSchema = z.object({
  percent: z.number().min(0).max(100),
});

export class CreatePricingPlanDto extends createZodDto(
  CreatePricingPlanSchema,
) {}
export class UpdatePricingPlanDto extends createZodDto(
  UpdatePricingPlanSchema,
) {}
export class PricingPlanIdParamsDto extends createZodDto(
  PricingPlanIdParamsSchema,
) {}
export class UpdatePlatformFeeDto extends createZodDto(
  UpdatePlatformFeeSchema,
) {}

// ============================================
// Refund DTOs (Admin)
// ============================================

export const RefundPaymentSchema = z.object({
  amountInCents: z.number().int().positive().optional(),
  reason: z
    .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
    .optional(),
  notes: z.string().max(1000).optional(),
});

export class RefundPaymentDto extends createZodDto(RefundPaymentSchema) {}

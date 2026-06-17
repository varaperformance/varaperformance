import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const BillingCycleSchema = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const BookingStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const SubscriptionStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'PAUSED',
  'CANCELLED',
  'PAST_DUE',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const PaymentProviderSchema = z.enum(['STRIPE']);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

// ============================================
// Coach Package Schemas
// ============================================

export const CoachPackageResponseSchema = z.object({
  id: z.uuid(),
  coachId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  priceInCents: z.number().int(),
  billingCycle: BillingCycleSchema,
  features: z.array(z.string()),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CoachPackageResponse = z.infer<typeof CoachPackageResponseSchema>;

export const CoachPackageWithCoachSchema = CoachPackageResponseSchema.extend({
  coach: z.object({
    title: z.string().optional(),
  }),
});

export type CoachPackageWithCoach = z.infer<typeof CoachPackageWithCoachSchema>;

// ============================================
// Subscription Schemas
// ============================================

export const SubscriptionResponseSchema = z.object({
  id: z.uuid(),
  bookingId: z.uuid(),
  packageId: z.uuid(),
  status: SubscriptionStatusSchema,
  paymentProvider: PaymentProviderSchema,
  stripeSubscriptionId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelledAt: z.date().nullable(),
  scheduledCancellationAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

// ============================================
// Booking Schemas
// ============================================

export const BookingResponseSchema = z.object({
  id: z.uuid(),
  referenceCode: z.string(),
  userId: z.uuid(),
  coachId: z.uuid(),
  packageId: z.uuid(),
  status: BookingStatusSchema,
  paymentProvider: PaymentProviderSchema,
  stripeCheckoutSessionId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  paidAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BookingResponse = z.infer<typeof BookingResponseSchema>;

export const BookingWithSubscriptionSchema = BookingResponseSchema.extend({
  subscription: SubscriptionResponseSchema.nullable(),
});

export type BookingWithSubscription = z.infer<
  typeof BookingWithSubscriptionSchema
>;

// ============================================
// Booking Payment Schemas
// ============================================

export const BookingPaymentResultSchema = z.object({
  booking: BookingResponseSchema,
  subscription: SubscriptionResponseSchema.optional(),
  paymentProvider: PaymentProviderSchema.optional(),
  checkoutUrl: z.url().optional(),
});

export type BookingPaymentResult = z.infer<typeof BookingPaymentResultSchema>;

// ============================================
// User Bookings Response (list view)
// ============================================

const BookingCoachInfoSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  user: z.object({
    email: z.email(),
    profile: z
      .object({
        displayName: z.string().nullable(),
        avatarUrl: z.string().nullable(),
      })
      .nullable(),
  }),
});

export const UserBookingResponseSchema = BookingResponseSchema.extend({
  subscription: SubscriptionResponseSchema.nullable(),
  coach: BookingCoachInfoSchema,
  package: CoachPackageResponseSchema,
});

export type UserBookingResponse = z.infer<typeof UserBookingResponseSchema>;

export const UserBookingsListDataSchema = z.object({
  bookings: z.array(UserBookingResponseSchema),
});

export type UserBookingsListData = z.infer<typeof UserBookingsListDataSchema>;

// ============================================
// Payment Schemas
// ============================================

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentTypeSchema = z.enum(['ONE_TIME', 'SUBSCRIPTION', 'REFUND']);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;

export const RefundReasonSchema = z.enum([
  'REQUESTED_BY_CUSTOMER',
  'DUPLICATE',
  'FRAUDULENT',
  'SERVICE_NOT_RENDERED',
  'OTHER',
]);
export type RefundReason = z.infer<typeof RefundReasonSchema>;

export const PaymentResponseSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  provider: PaymentProviderSchema,
  stripeCheckoutSessionId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  stripeInvoiceId: z.string().nullable(),
  amountInCents: z.number().int(),
  currency: z.string(),
  feeInCents: z.number().int().nullable(),
  status: PaymentStatusSchema,
  type: PaymentTypeSchema,
  bookingId: z.uuid().nullable(),
  orderId: z.string().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  paidAt: z.date().nullable(),
  refundedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

// ============================================
// Refund Schemas
// ============================================

export const RefundResponseSchema = z.object({
  id: z.uuid(),
  paymentId: z.uuid(),
  stripeRefundId: z.string(),
  amountInCents: z.number().int(),
  reason: RefundReasonSchema,
  notes: z.string().nullable(),
  status: PaymentStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export const StripeCustomerResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  stripeCustomerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type StripeCustomerResponse = z.infer<
  typeof StripeCustomerResponseSchema
>;

export const PaymentWithRefundsSchema = PaymentResponseSchema.extend({
  refunds: z.array(RefundResponseSchema),
  customer: StripeCustomerResponseSchema,
});

export type PaymentWithRefunds = z.infer<typeof PaymentWithRefundsSchema>;

// ============================================
// Pricing + Platform Settings Schemas
// ============================================

export const PricingPlanAudienceSchema = z.enum(['FREE', 'COACH', 'GYM']);
export type PricingPlanAudience = z.infer<typeof PricingPlanAudienceSchema>;

export const PricingPlanFeatureSchema = z.object({
  id: z.uuid(),
  text: z.string(),
  sortOrder: z.number().int(),
});

export const PricingPlanSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  audience: PricingPlanAudienceSchema,
  priceInCents: z.number().int(),
  periodLabel: z.string().nullable(),
  cta: z.string(),
  ctaLink: z.string(),
  highlighted: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  features: z.array(PricingPlanFeatureSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PricingPlan = z.infer<typeof PricingPlanSchema>;

export const PricingPlansDataSchema = z.object({
  plans: z.array(PricingPlanSchema),
});

export type PricingPlansData = z.infer<typeof PricingPlansDataSchema>;

export const PlatformFeeSettingSchema = z.object({
  percent: z.number().min(0).max(100),
});

export type PlatformFeeSetting = z.infer<typeof PlatformFeeSettingSchema>;

// ============================================
// Coach Tier Subscription Schemas
// ============================================

export const CoachTierSubscriptionResponseSchema = z.object({
  id: z.uuid(),
  coachId: z.uuid(),
  pricingPlanId: z.uuid(),
  status: SubscriptionStatusSchema,
  stripeSubscriptionId: z.string().nullable(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  scheduledCancellationAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  pricingPlan: PricingPlanSchema,
});

export type CoachTierSubscriptionResponse = z.infer<
  typeof CoachTierSubscriptionResponseSchema
>;

export const CoachTierCancelEligibilitySchema = z.object({
  canCancel: z.boolean(),
  activeBookingCount: z.number().int(),
  activeClientSubscriptionCount: z.number().int(),
  reasons: z.array(z.string()),
});

export type CoachTierCancelEligibility = z.infer<
  typeof CoachTierCancelEligibilitySchema
>;

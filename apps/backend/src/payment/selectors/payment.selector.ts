/**
 * Prisma selectors for payment module
 * These define exactly which fields to fetch from the database
 */

// ============================================
// Coach Package Selectors
// ============================================

export const coachPackageSelect = {
  id: true,
  coachId: true,
  name: true,
  description: true,
  priceInCents: true,
  billingCycle: true,
  features: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;
export type CoachPackageSelect = typeof coachPackageSelect;

export const coachPackageWithCoachSelect = {
  ...coachPackageSelect,
  coach: {
    select: {
      title: true,
    },
  },
} as const;
export type CoachPackageWithCoachSelect = typeof coachPackageWithCoachSelect;

// ============================================
// Subscription Selectors
// ============================================

export const subscriptionSelect = {
  id: true,
  bookingId: true,
  packageId: true,
  status: true,
  paymentProvider: true,
  stripeSubscriptionId: true,
  stripeCustomerId: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelledAt: true,
  scheduledCancellationAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
export type SubscriptionSelect = typeof subscriptionSelect;

export const subscriptionWithBookingUserSelect = {
  ...subscriptionSelect,
  booking: {
    select: {
      userId: true,
    },
  },
} as const;
export type SubscriptionWithBookingUserSelect =
  typeof subscriptionWithBookingUserSelect;

// ============================================
// Booking Selectors
// ============================================

export const bookingSelect = {
  id: true,
  referenceCode: true,
  userId: true,
  coachId: true,
  packageId: true,
  status: true,
  paymentProvider: true,
  stripeCheckoutSessionId: true,
  stripePaymentIntentId: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
export type BookingSelect = typeof bookingSelect;

export const bookingWithSubscriptionSelect = {
  ...bookingSelect,
  subscription: {
    select: subscriptionSelect,
  },
} as const;
export type BookingWithSubscriptionSelect =
  typeof bookingWithSubscriptionSelect;

// Booking with coach info for user's booking list
export const userBookingSelect = {
  ...bookingSelect,
  subscription: {
    select: subscriptionSelect,
  },
  coach: {
    select: {
      id: true,
      title: true,
      user: {
        select: {
          email: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  },
  package: {
    select: coachPackageSelect,
  },
} as const;
export type UserBookingSelect = typeof userBookingSelect;

// ============================================
// Payment Selectors
// ============================================

export const paymentSelect = {
  id: true,
  customerId: true,
  provider: true,
  stripeCheckoutSessionId: true,
  stripePaymentIntentId: true,
  stripeSubscriptionId: true,
  stripeInvoiceId: true,
  amountInCents: true,
  currency: true,
  feeInCents: true,
  status: true,
  type: true,
  bookingId: true,
  orderId: true,
  failureCode: true,
  failureMessage: true,
  paidAt: true,
  refundedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
export type PaymentSelect = typeof paymentSelect;

export const refundSelect = {
  id: true,
  paymentId: true,
  stripeRefundId: true,
  amountInCents: true,
  reason: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;
export type RefundSelect = typeof refundSelect;

export const paymentWithRefundsSelect = {
  ...paymentSelect,
  refunds: {
    select: refundSelect,
  },
} as const;
export type PaymentWithRefundsSelect = typeof paymentWithRefundsSelect;

export const paymentAdminListSelect = {
  ...paymentSelect,
  customer: {
    select: {
      stripeCustomerId: true,
      user: {
        select: {
          email: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  },
} as const;
export type PaymentAdminListSelect = typeof paymentAdminListSelect;

export const subscriptionAdminListSelect = {
  ...subscriptionSelect,
  booking: {
    select: {
      referenceCode: true,
      user: {
        select: {
          email: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
      coach: {
        select: {
          user: {
            select: {
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
  },
  package: {
    select: {
      name: true,
      priceInCents: true,
      billingCycle: true,
    },
  },
} as const;
export type SubscriptionAdminListSelect = typeof subscriptionAdminListSelect;

export const pricingPlanFeatureSelect = {
  id: true,
  text: true,
  sortOrder: true,
} as const;
export type PricingPlanFeatureSelect = typeof pricingPlanFeatureSelect;

export const pricingPlanSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  audience: true,
  priceInCents: true,
  periodLabel: true,
  cta: true,
  ctaLink: true,
  highlighted: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  features: {
    orderBy: {
      sortOrder: 'asc',
    },
    select: pricingPlanFeatureSelect,
  },
} as const;
export type PricingPlanSelect = typeof pricingPlanSelect;

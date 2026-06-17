import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { SecretsService } from '@app/common/secrets';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../notification/notification.service';
import type {
  ErrorResponse,
  SuccessResponse,
  CoachTierSubscriptionResponse,
  CoachTierCancelEligibility,
} from '@varaperformance/core';

const coachTierSubscriptionSelect = {
  id: true,
  coachId: true,
  pricingPlanId: true,
  status: true,
  stripeSubscriptionId: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelledAt: true,
  scheduledCancellationAt: true,
  createdAt: true,
  updatedAt: true,
  pricingPlan: {
    select: {
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
      features: {
        select: { id: true, text: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' as const },
      },
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

@Injectable()
export class CoachTierSubscriptionService {
  private readonly logger = new Logger(CoachTierSubscriptionService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly stripeService: StripeService,
    private readonly secrets: SecretsService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get the coach's current tier subscription.
   */
  async getTierSubscription(
    userId: string,
  ): Promise<
    SuccessResponse<CoachTierSubscriptionResponse | null> | ErrorResponse
  > {
    const coach = await this.prisma.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach profile not found' },
      };
    }

    const sub = await this.prisma.coachTierSubscription.findUnique({
      where: { coachId: coach.id },
      select: coachTierSubscriptionSelect,
    });

    return { success: true, data: sub };
  }

  /**
   * Create a Stripe Checkout session for the coach tier subscription.
   */
  async createCheckout(
    userId: string,
  ): Promise<
    | SuccessResponse<{ checkoutUrl: string; checkoutSessionId: string }>
    | ErrorResponse
  > {
    if (!this.stripeService.isConfigured()) {
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Stripe is not configured' },
      };
    }

    const coach = await this.prisma.coach.findUnique({
      where: { userId },
      select: {
        id: true,
        isVerified: true,
        user: { select: { email: true } },
        tierSubscription: { select: { id: true, status: true } },
      },
    });

    if (!coach) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach profile not found' },
      };
    }

    if (!coach.isVerified) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Coach must be approved before subscribing',
        },
      };
    }

    // Prevent duplicate active subscriptions
    if (
      coach.tierSubscription &&
      ['ACTIVE', 'PAST_DUE'].includes(coach.tierSubscription.status)
    ) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'You already have an active tier subscription',
        },
      };
    }

    // Find the COACH pricing plan
    const coachPlan = await this.prisma.pricingPlan.findFirst({
      where: { audience: 'COACH', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (!coachPlan) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coach pricing plan not found',
        },
      };
    }

    const stripe = this.stripeService.getClient();

    // Get or create Stripe customer
    let stripeCustomer = await this.prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!stripeCustomer) {
      const customer = await stripe.customers.create({
        email: coach.user.email,
        metadata: { userId },
      });
      stripeCustomer = await this.prisma.stripeCustomer.create({
        data: { userId, stripeCustomerId: customer.id },
      });
    }

    const webOrigin =
      this.secrets.get('WEB_ORIGIN') ||
      this.secrets.get('APP_WEB_URL') ||
      this.secrets.get('FRONTEND_URL');

    if (!webOrigin) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Frontend origin is not configured',
        },
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomer.stripeCustomerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: coachPlan.priceInCents,
            product_data: {
              name: coachPlan.name,
              description: coachPlan.description || undefined,
            },
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
          },
        },
      ],
      metadata: {
        type: 'coach_tier',
        coachId: coach.id,
        userId,
        pricingPlanId: coachPlan.id,
      },
      subscription_data: {
        metadata: {
          type: 'coach_tier',
          coachId: coach.id,
          userId,
          pricingPlanId: coachPlan.id,
        },
      },
      success_url: `${webOrigin}/coaches/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webOrigin}/coaches/subscription?checkout=cancel`,
    });

    // Upsert the tier subscription record as PENDING
    await this.prisma.coachTierSubscription.upsert({
      where: { coachId: coach.id },
      update: {
        pricingPlanId: coachPlan.id,
        status: 'PENDING',
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: stripeCustomer.stripeCustomerId,
      },
      create: {
        coachId: coach.id,
        pricingPlanId: coachPlan.id,
        status: 'PENDING',
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: stripeCustomer.stripeCustomerId,
        paymentProvider: 'STRIPE',
      },
    });

    return {
      success: true,
      data: {
        checkoutUrl: session.url!,
        checkoutSessionId: session.id,
      },
    };
  }

  /**
   * Called by webhook when coach tier checkout completes.
   */
  async handleCheckoutCompleted(
    coachId: string,
    stripeSubscriptionId: string,
    checkoutSessionId: string,
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await this.prisma.$transaction(async (tx) => {
      await tx.coachTierSubscription.update({
        where: { coachId },
        data: {
          status: 'ACTIVE',
          stripeSubscriptionId,
          stripeCheckoutSessionId: checkoutSessionId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      // Activate the coach
      await tx.coach.update({
        where: { id: coachId },
        data: { isAvailable: true },
      });
    });

    const coach = await this.prisma.coach.findUnique({
      where: { id: coachId },
      select: { userId: true },
    });

    if (coach) {
      void this.notificationService.create({
        userId: coach.userId,
        type: 'SYSTEM',
        title: 'Subscription activated',
        body: 'Your coach tier subscription is now active. You can start accepting clients.',
        actionUrl: '/coaches/dashboard',
      });
    }
  }

  /**
   * Called by webhook when a tier subscription invoice is paid (renewal).
   */
  async handleInvoicePaid(
    stripeSubscriptionId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    await this.prisma.coachTierSubscription.update({
      where: { stripeSubscriptionId },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        scheduledCancellationAt: null,
      },
    });
  }

  /**
   * Called by webhook when a tier subscription invoice fails.
   */
  async handleInvoicePaymentFailed(
    stripeSubscriptionId: string,
  ): Promise<void> {
    const sub = await this.prisma.coachTierSubscription.update({
      where: { stripeSubscriptionId },
      data: { status: 'PAST_DUE' },
      select: { coach: { select: { userId: true } } },
    });

    void this.notificationService.create({
      userId: sub.coach.userId,
      type: 'SYSTEM',
      title: 'Payment failed',
      body: 'Your coach tier subscription payment failed. Please update your payment method to avoid service interruption.',
      actionUrl: '/coaches/subscription',
    });
  }

  /**
   * Called by webhook when subscription status changes.
   */
  async handleSubscriptionUpdated(
    stripeSubscriptionId: string,
    stripeStatus: string,
    cancelledAt: Date | null,
    periodStart: Date | null,
    periodEnd: Date | null,
  ): Promise<void> {
    const statusMap: Record<string, string> = {
      incomplete: 'PENDING',
      incomplete_expired: 'CANCELLED',
      trialing: 'ACTIVE',
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      unpaid: 'PAST_DUE',
      paused: 'PAUSED',
    };

    const mappedStatus = statusMap[stripeStatus] ?? 'PENDING';

    const updateData: Record<string, unknown> = {
      status: mappedStatus,
    };

    if (cancelledAt) updateData.cancelledAt = cancelledAt;
    if (periodStart) updateData.currentPeriodStart = periodStart;
    if (periodEnd) updateData.currentPeriodEnd = periodEnd;

    const sub = await this.prisma.coachTierSubscription.update({
      where: { stripeSubscriptionId },
      data: updateData,
      select: { coachId: true, coach: { select: { userId: true } } },
    });

    // If cancelled, deactivate the coach
    if (mappedStatus === 'CANCELLED') {
      await this.prisma.coach.update({
        where: { id: sub.coachId },
        data: { isAvailable: false },
      });

      void this.notificationService.create({
        userId: sub.coach.userId,
        type: 'SYSTEM',
        title: 'Subscription cancelled',
        body: 'Your coach tier subscription has been cancelled. You will no longer appear in coach listings.',
        actionUrl: '/coaches/subscription',
      });
    }
  }

  /**
   * Check if the coach can cancel their tier subscription (guardrails).
   */
  async getCancelEligibility(
    userId: string,
  ): Promise<SuccessResponse<CoachTierCancelEligibility> | ErrorResponse> {
    const coach = await this.prisma.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach profile not found' },
      };
    }

    const activeBookingCount = await this.prisma.booking.count({
      where: {
        coachId: coach.id,
        status: { in: ['CONFIRMED', 'APPROVED'] },
      },
    });

    const activeClientSubscriptionCount = await this.prisma.subscription.count({
      where: {
        booking: { coachId: coach.id },
        status: { in: ['ACTIVE', 'PAST_DUE'] },
      },
    });

    const reasons: string[] = [];

    if (activeBookingCount > 0) {
      reasons.push(
        `You have ${activeBookingCount} active booking${activeBookingCount > 1 ? 's' : ''}. Complete or cancel them first.`,
      );
    }

    if (activeClientSubscriptionCount > 0) {
      reasons.push(
        `You have ${activeClientSubscriptionCount} active client subscription${activeClientSubscriptionCount > 1 ? 's' : ''}. Cancel them first.`,
      );
    }

    return {
      success: true,
      data: {
        canCancel: reasons.length === 0,
        activeBookingCount,
        activeClientSubscriptionCount,
        reasons,
      },
    };
  }

  /**
   * Cancel the coach's tier subscription at period end with guardrails.
   */
  async cancelTierSubscription(
    userId: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    // Check guardrails
    const eligibility = await this.getCancelEligibility(userId);
    if (!eligibility.success) return eligibility;
    if ('data' in eligibility && !eligibility.data.canCancel) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Cannot cancel subscription',
          details: {
            reasons: eligibility.data.reasons,
          },
        },
      };
    }

    const coach = await this.prisma.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach profile not found' },
      };
    }

    const sub = await this.prisma.coachTierSubscription.findUnique({
      where: { coachId: coach.id },
    });

    if (!sub || sub.status === 'CANCELLED') {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'No active tier subscription' },
      };
    }

    // Cancel in Stripe at period end
    if (sub.stripeSubscriptionId && this.stripeService.isConfigured()) {
      const stripe = this.stripeService.getClient();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    await this.prisma.coachTierSubscription.update({
      where: { coachId: coach.id },
      data: {
        scheduledCancellationAt: sub.currentPeriodEnd,
      },
    });

    return {
      success: true,
      data: {
        message:
          'Subscription will be cancelled at the end of the current billing period',
      },
    };
  }
}

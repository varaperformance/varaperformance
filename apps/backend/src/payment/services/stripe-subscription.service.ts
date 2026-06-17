import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { SecretsService } from '@app/common/secrets';
import { BillingCycle } from '@generated/prisma';
import { StripeService } from './stripe.service';
import { PaymentService } from './payment.service';
import type { ErrorResponse, SuccessResponse } from '@varaperformance/core';

interface CreateStripeCheckoutParams {
  userId: string;
  bookingId: string;
  packageName: string;
  packageDescription?: string;
  priceInCents: number;
  billingCycle: BillingCycle;
}

@Injectable()
export class StripeSubscriptionService {
  private readonly logger = new Logger(StripeSubscriptionService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly stripeService: StripeService,
    private readonly secrets: SecretsService,
    private readonly paymentService: PaymentService,
  ) {}

  async createSubscriptionCheckout(params: CreateStripeCheckoutParams): Promise<
    | SuccessResponse<{
        checkoutUrl: string;
        checkoutSessionId: string;
      }>
    | ErrorResponse
  > {
    if (!this.stripeService.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Stripe is not configured',
        },
      };
    }

    const {
      userId,
      bookingId,
      packageName,
      packageDescription,
      priceInCents,
      billingCycle,
    } = params;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        coach: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!booking || booking.userId !== userId) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found',
        },
      };
    }

    if (!booking.coach.stripeAccountId) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Coach has not connected Stripe yet',
        },
      };
    }

    if (
      !booking.coach.stripeChargesEnabled ||
      !booking.coach.stripePayoutsEnabled
    ) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Coach Stripe account is not fully enabled yet',
        },
      };
    }

    const stripe = this.stripeService.getClient();

    let stripeCustomer = await this.prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!stripeCustomer) {
      const customer = await stripe.customers.create({
        email: booking.user.email,
        metadata: {
          userId,
        },
      });

      stripeCustomer = await this.prisma.stripeCustomer.create({
        data: {
          userId,
          stripeCustomerId: customer.id,
        },
      });
    }

    const intervalMap: Record<
      BillingCycle,
      { interval: 'month' | 'year'; intervalCount: number }
    > = {
      MONTHLY: { interval: 'month', intervalCount: 1 },
      QUARTERLY: { interval: 'month', intervalCount: 3 },
      YEARLY: { interval: 'year', intervalCount: 1 },
    };

    const feePercent = await this.paymentService.getPlatformFeePercent();
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
            unit_amount: priceInCents,
            product_data: {
              name: packageName,
              description: packageDescription,
            },
            recurring: {
              interval: intervalMap[billingCycle].interval,
              interval_count: intervalMap[billingCycle].intervalCount,
            },
          },
        },
      ],
      metadata: {
        bookingId,
        userId,
        coachId: booking.coachId,
        packageId: booking.packageId,
      },
      subscription_data: {
        metadata: {
          bookingId,
          userId,
          coachId: booking.coachId,
          packageId: booking.packageId,
        },
        transfer_data: {
          destination: booking.coach.stripeAccountId,
        },
        application_fee_percent: feePercent,
      },
      success_url: `${webOrigin}/my-coaching?checkout=success&booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webOrigin}/my-coaching?checkout=cancel&booking_id=${bookingId}`,
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentProvider: 'STRIPE',
        stripeCheckoutSessionId: session.id,
      },
    });

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { bookingId },
    });

    if (existingSubscription) {
      await this.prisma.subscription.update({
        where: { bookingId },
        data: {
          paymentProvider: 'STRIPE',
          status: 'PENDING',
          stripeCustomerId: stripeCustomer.stripeCustomerId,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          bookingId,
          packageId: booking.packageId,
          paymentProvider: 'STRIPE',
          status: 'PENDING',
          stripeCustomerId: stripeCustomer.stripeCustomerId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (!session.url) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Stripe checkout URL not returned',
        },
      };
    }

    this.logger.log(
      `Created Stripe Checkout session ${session.id} for booking ${bookingId}`,
    );

    return {
      success: true,
      data: {
        checkoutUrl: session.url,
        checkoutSessionId: session.id,
      },
    };
  }
}

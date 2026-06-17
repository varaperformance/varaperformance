import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { DatabaseService } from '@app/database';
import { RedisService } from '@app/database/redis.service';
import { StripeService } from './stripe.service';
import { CoachingPaymentService } from './coaching-payment.service';
import { PaymentService } from './payment.service';
import { NotificationService } from '../../notification/notification.service';
import { ModuleRef } from '@nestjs/core';
import { CommerceService } from '../../commerce/commerce.service';
import { CoachTierSubscriptionService } from './coach-tier-subscription.service';

/** Reject webhook events older than 5 minutes. */
const MAX_EVENT_AGE_SECONDS = 300;
/** Keep processed event IDs in Redis for 48h to prevent replays. */
const EVENT_DEDUP_TTL_SECONDS = 172_800;

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: DatabaseService,
    private readonly redisService: RedisService,
    private readonly coachingPaymentService: CoachingPaymentService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly moduleRef: ModuleRef,
    private readonly coachTierSubscriptionService: CoachTierSubscriptionService,
  ) {}

  private getCommerceService(): CommerceService | null {
    try {
      return this.moduleRef.get(CommerceService, { strict: false });
    } catch {
      return null;
    }
  }

  constructEvent(rawBody: string, signature: string): Stripe.Event {
    return this.stripeService
      .getClient()
      .webhooks.constructEvent(
        rawBody,
        signature,
        this.stripeService.getWebhookSecret(),
      );
  }

  async processEvent(event: Stripe.Event): Promise<void> {
    const eventAgeSeconds = Math.floor(Date.now() / 1000) - event.created;
    if (eventAgeSeconds > MAX_EVENT_AGE_SECONDS) {
      this.logger.warn(
        `Rejecting stale Stripe event ${event.id} (age: ${eventAgeSeconds}s)`,
      );
      return;
    }

    const dedupKey = `stripe:event:${event.id}`;
    const alreadyProcessed = await this.redisService.get(dedupKey);
    if (alreadyProcessed) {
      this.logger.warn(`Duplicate Stripe event ${event.id}, skipping`);
      return;
    }

    await this.redisService.set(dedupKey, '1', EVENT_DEDUP_TTL_SECONDS);

    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutSessionExpired(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object);
        break;
      case 'refund.created':
      case 'refund.updated':
        await this.handleRefundUpdated(event.data.object);
        break;
      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (session.metadata?.source === 'SHOP' && session.metadata?.orderId) {
      const commerceService = this.getCommerceService();
      if (!commerceService) {
        this.logger.warn(
          'CommerceService not available for SHOP webhook event',
        );
        return;
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

      const shippingDetailsFromSession = (
        session as Stripe.Checkout.Session & {
          shipping_details?: {
            name?: string | null;
            phone?: string | null;
            address?: Stripe.Address | null;
          } | null;
        }
      ).shipping_details;

      const shippingAddress =
        shippingDetailsFromSession?.address ??
        session.customer_details?.address;
      const shippingDetails = shippingAddress
        ? {
            name:
              shippingDetailsFromSession?.name ??
              session.customer_details?.name,
            phone:
              shippingDetailsFromSession?.phone ??
              session.customer_details?.phone,
            address: {
              line1: shippingAddress.line1 ?? null,
              line2: shippingAddress.line2 ?? null,
              city: shippingAddress.city ?? null,
              state: shippingAddress.state ?? null,
              postalCode: shippingAddress.postal_code ?? null,
              country: shippingAddress.country ?? null,
            },
          }
        : null;

      await commerceService.handleShopOrderPaid({
        orderId: session.metadata.orderId,
        paymentIntentId,
        shippingDetails,
      });
      return;
    }

    // Handle coach tier subscription checkout
    if (session.metadata?.type === 'coach_tier') {
      const coachId = session.metadata.coachId;
      const stripeSubscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
      if (coachId && stripeSubscriptionId) {
        await this.coachTierSubscriptionService.handleCheckoutCompleted(
          coachId,
          stripeSubscriptionId,
          session.id,
        );
      }
      return;
    }

    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      return;
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentProvider: 'STRIPE',
        stripeCheckoutSessionId: session.id,
      },
    });

    if (typeof session.subscription === 'string') {
      await this.prisma.subscription.updateMany({
        where: { bookingId },
        data: {
          paymentProvider: 'STRIPE',
          stripeSubscriptionId: session.subscription,
          stripeCustomerId:
            typeof session.customer === 'string' ? session.customer : null,
        },
      });
    }
  }

  private async handleCheckoutSessionExpired(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (session.metadata?.source !== 'SHOP' || !session.metadata?.orderId) {
      return;
    }

    const commerceService = this.getCommerceService();
    if (!commerceService) {
      this.logger.warn('CommerceService not available for SHOP webhook event');
      return;
    }

    await commerceService.handleShopOrderCancelled({
      orderId: session.metadata.orderId,
    });
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const commerceService = this.getCommerceService();
    if (!commerceService) {
      this.logger.warn('CommerceService not available for SHOP refund webhook');
      return;
    }

    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      return;
    }

    const refunds = charge.refunds?.data ?? [];
    const latestRefund =
      refunds.length > 0
        ? [...refunds].sort((a, b) => b.created - a.created)[0]
        : null;

    await commerceService.handleShopOrderRefunded({
      paymentIntentId,
      refundId: latestRefund?.id,
      reason: latestRefund?.reason ?? null,
      status: latestRefund?.status ?? null,
      amountRefundedInCents: charge.amount_refunded,
      chargeAmountInCents: charge.amount,
    });
  }

  private async handleRefundUpdated(refund: Stripe.Refund): Promise<void> {
    const commerceService = this.getCommerceService();
    if (!commerceService) {
      this.logger.warn('CommerceService not available for SHOP refund webhook');
      return;
    }

    const chargeId =
      typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;

    if (!chargeId) {
      return;
    }

    const charge = await this.stripeService
      .getClient()
      .charges.retrieve(chargeId, {
        expand: ['payment_intent'],
      });

    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      return;
    }

    await commerceService.handleShopOrderRefunded({
      paymentIntentId,
      refundId: refund.id,
      reason: refund.reason ?? null,
      status: refund.status ?? null,
      amountRefundedInCents: charge.amount_refunded,
      chargeAmountInCents: charge.amount,
    });
  }

  private async handlePaymentIntentCanceled(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    if (paymentIntent.metadata?.source !== 'SHOP') {
      return;
    }

    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      return;
    }

    const commerceService = this.getCommerceService();
    if (!commerceService) {
      this.logger.warn(
        'CommerceService not available for SHOP payment intent webhook',
      );
      return;
    }

    await commerceService.handleShopOrderCancelled({ orderId });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = this.getInvoiceSubscriptionId(invoice);
    if (!stripeSubscriptionId) {
      return;
    }

    // Check if this is a coach tier subscription invoice
    const coachTierSub = await this.prisma.coachTierSubscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (coachTierSub) {
      const period = invoice.lines.data[0]?.period;
      await this.coachTierSubscriptionService.handleInvoicePaid(
        stripeSubscriptionId,
        period?.start
          ? new Date(period.start * 1000)
          : (coachTierSub.currentPeriodStart ?? new Date()),
        period?.end
          ? new Date(period.end * 1000)
          : (coachTierSub.currentPeriodEnd ?? new Date()),
      );
      return;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
      include: {
        booking: {
          include: {
            coach: true,
          },
        },
      },
    });

    if (!subscription) {
      this.logger.warn(
        `No local subscription found for Stripe subscription ${stripeSubscriptionId}`,
      );
      return;
    }

    const amountInCents = invoice.amount_paid || 0;
    const currency = (invoice.currency || 'usd').toUpperCase();
    const stripePaymentIntentId = this.getInvoicePaymentIntentId(invoice);
    const stripeCustomerId =
      typeof invoice.customer === 'string' ? invoice.customer : null;

    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { stripeInvoiceId: invoice.id },
          ...(stripePaymentIntentId ? [{ stripePaymentIntentId }] : []),
        ],
      },
    });

    let paymentId: string;

    if (existingPayment) {
      paymentId = existingPayment.id;
    } else {
      const stripeCustomer = stripeCustomerId
        ? await this.prisma.stripeCustomer.findUnique({
            where: { stripeCustomerId },
          })
        : null;

      if (!stripeCustomer) {
        this.logger.warn(
          `No StripeCustomer record found for invoice ${invoice.id} customer ${stripeCustomerId}`,
        );
        return;
      }

      const payment = await this.prisma.payment.create({
        data: {
          customerId: stripeCustomer.id,
          provider: 'STRIPE',
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId,
          stripeSubscriptionId,
          amountInCents,
          currency,
          status: 'SUCCEEDED',
          type: 'SUBSCRIPTION',
          bookingId: subscription.bookingId,
          paidAt: new Date(),
        },
      });

      paymentId = payment.id;
    }

    const period = invoice.lines.data[0]?.period;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: period?.start
          ? new Date(period.start * 1000)
          : subscription.currentPeriodStart,
        currentPeriodEnd: period?.end
          ? new Date(period.end * 1000)
          : subscription.currentPeriodEnd,
      },
    });

    if (subscription.booking.status !== 'CONFIRMED') {
      await this.coachingPaymentService.confirmBookingPayment(
        subscription.bookingId,
      );
    }

    await this.prisma.booking.update({
      where: { id: subscription.bookingId },
      data: {
        paymentProvider: 'STRIPE',
        stripePaymentIntentId,
      },
    });

    const existingLedger = await this.prisma.coachLedgerEntry.findFirst({
      where: {
        coachId: subscription.booking.coachId,
        type: 'SALE',
        referenceId: invoice.id,
      },
    });

    if (!existingLedger) {
      const platformFeePercent =
        await this.paymentService.getPlatformFeePercent();
      const platformFeeInCents = Math.round(
        amountInCents * (platformFeePercent / 100),
      );
      const netAmountInCents = amountInCents - platformFeeInCents;

      await this.prisma.coachLedgerEntry.create({
        data: {
          coachId: subscription.booking.coachId,
          paymentId,
          provider: 'STRIPE',
          type: 'SALE',
          grossAmountInCents: amountInCents,
          platformFeeInCents,
          processorFeeInCents: 0,
          netAmountInCents,
          referenceId: invoice.id,
          metadata: {
            stripeSubscriptionId,
            bookingId: subscription.bookingId,
          },
        },
      });
    }

    // Notify client and coach about subscription renewal
    if (subscription.booking?.userId) {
      void this.notificationService.create({
        userId: subscription.booking.userId,
        type: 'SUBSCRIPTION_RENEWED',
        title: 'Subscription renewed',
        body: 'Your coaching subscription has been renewed successfully.',
        actionUrl: '/coaching',
        data: { bookingId: subscription.bookingId },
      });
    }
    if (subscription.booking?.coach?.userId) {
      void this.notificationService.create({
        userId: subscription.booking.coach.userId,
        type: 'SUBSCRIPTION_RENEWED',
        title: 'Subscription renewed',
        body: 'A client subscription has been renewed.',
        actionUrl: '/coaching',
        data: { bookingId: subscription.bookingId },
      });
    }
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const stripeSubscriptionId = this.getInvoiceSubscriptionId(invoice);

    if (!stripeSubscriptionId) {
      return;
    }

    // Check if this is a coach tier subscription
    const coachTierSubFailed =
      await this.prisma.coachTierSubscription.findUnique({
        where: { stripeSubscriptionId },
      });

    if (coachTierSubFailed) {
      await this.coachTierSubscriptionService.handleInvoicePaymentFailed(
        stripeSubscriptionId,
      );
      return;
    }

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId },
      data: {
        status: 'PAST_DUE',
      },
    });

    // Notify the subscriber their payment failed
    const failedSub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
      include: { booking: { select: { userId: true } } },
    });
    if (failedSub?.booking?.userId) {
      void this.notificationService.create({
        userId: failedSub.booking.userId,
        type: 'PAYMENT_FAILED',
        title: 'Payment failed',
        body: 'Your subscription payment failed. Please update your payment method to avoid service interruption.',
        actionUrl: '/elevate/studio?section=settings',
      });
    }
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const stripeSubscriptionId = subscription.id;

    const statusMap: Record<
      string,
      'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PAST_DUE'
    > = {
      incomplete: 'PENDING',
      incomplete_expired: 'CANCELLED',
      trialing: 'ACTIVE',
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      unpaid: 'PAST_DUE',
      paused: 'PAUSED',
    };

    const periodStarts = subscription.items.data
      .map((item) => item.current_period_start)
      .filter((value) => Number.isFinite(value));

    const periodEnds = subscription.items.data
      .map((item) => item.current_period_end)
      .filter((value) => Number.isFinite(value));

    const currentPeriodStart =
      periodStarts.length > 0
        ? new Date(Math.min(...periodStarts) * 1000)
        : undefined;

    const currentPeriodEnd =
      periodEnds.length > 0
        ? new Date(Math.max(...periodEnds) * 1000)
        : undefined;

    const mappedStatus = statusMap[subscription.status] || 'ACTIVE';

    // Check if this is a coach tier subscription
    const coachTierSubUpdated =
      await this.prisma.coachTierSubscription.findUnique({
        where: { stripeSubscriptionId },
      });

    if (coachTierSubUpdated) {
      await this.coachTierSubscriptionService.handleSubscriptionUpdated(
        stripeSubscriptionId,
        subscription.status,
        subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        currentPeriodStart ?? null,
        currentPeriodEnd ?? null,
      );
      return;
    }

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId },
      data: {
        status: mappedStatus,
        ...(currentPeriodStart ? { currentPeriodStart } : {}),
        ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
        cancelledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
    });

    // Notify user when subscription is cancelled via Stripe
    if (mappedStatus === 'CANCELLED') {
      const sub = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
        include: { booking: { select: { userId: true } } },
      });
      if (sub?.booking?.userId) {
        void this.notificationService.create({
          userId: sub.booking.userId,
          type: 'SUBSCRIPTION_CANCELLED',
          title: 'Subscription cancelled',
          body: 'Your coaching subscription has been cancelled.',
          actionUrl: '/coaching',
          data: { bookingId: sub.bookingId },
        });
      }
    }
  }

  private getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    const parentSubscription =
      invoice.parent?.subscription_details?.subscription;

    if (!parentSubscription) {
      return null;
    }

    return typeof parentSubscription === 'string'
      ? parentSubscription
      : parentSubscription.id;
  }

  private getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
    const invoicePaymentIntent = invoice.payments?.data.find(
      (payment) => payment.payment.type === 'payment_intent',
    )?.payment.payment_intent;

    if (!invoicePaymentIntent) {
      return null;
    }

    return typeof invoicePaymentIntent === 'string'
      ? invoicePaymentIntent
      : invoicePaymentIntent.id;
  }
}

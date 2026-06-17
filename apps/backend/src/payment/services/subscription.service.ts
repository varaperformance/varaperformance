import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../notification/notification.service';
import type {
  ErrorResponse,
  SuccessResponse,
  SubscriptionResponse,
} from '@varaperformance/core';
import {
  subscriptionSelect,
  subscriptionWithBookingUserSelect,
} from '../selectors/payment.selector';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly stripeService: StripeService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Verify that the subscription belongs to the requesting user via its booking.
   * Returns an error response if ownership check fails, or null if valid.
   */
  private async verifyOwnership(
    subscriptionId: string,
    userId: string,
  ): Promise<ErrorResponse | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { booking: { select: { userId: true } } },
    });

    if (!subscription) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      };
    }

    if (subscription.booking?.userId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this subscription',
        },
      };
    }

    return null;
  }

  async getSubscriptionByBookingId(
    bookingId: string,
  ): Promise<
    | SuccessResponse<{ subscription: SubscriptionResponse | null }>
    | ErrorResponse
  > {
    const subscription = await this.prisma.subscription.findUnique({
      where: { bookingId },
      select: subscriptionSelect,
    });

    return { success: true, data: { subscription } };
  }

  async cancelSubscription(
    subscriptionId: string,
    userId?: string,
    immediately = false,
  ): Promise<
    SuccessResponse<{ subscription: SubscriptionResponse }> | ErrorResponse
  > {
    if (userId) {
      const ownershipError = await this.verifyOwnership(subscriptionId, userId);
      if (ownershipError) return ownershipError;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: subscriptionSelect,
    });

    if (!subscription) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      };
    }

    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (!stripeSubscriptionId || !this.stripeService.isConfigured()) {
      const updated = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          scheduledCancellationAt: null,
        },
        select: subscriptionWithBookingUserSelect,
      });

      if (updated.booking?.userId) {
        void this.notificationService.create({
          userId: updated.booking.userId,
          type: 'SUBSCRIPTION_CANCELLED',
          title: 'Subscription cancelled',
          body: 'Your coaching subscription has been cancelled.',
          actionUrl: '/coaching',
          data: { bookingId: updated.bookingId },
        });
      }

      const subscriptionData = Object.fromEntries(
        Object.entries(updated).filter(([key]) => key !== 'booking'),
      ) as SubscriptionResponse;
      return { success: true, data: { subscription: subscriptionData } };
    }

    try {
      if (immediately) {
        await this.stripeService
          .getClient()
          .subscriptions.cancel(stripeSubscriptionId);
      } else {
        await this.stripeService
          .getClient()
          .subscriptions.update(stripeSubscriptionId, {
            cancel_at_period_end: true,
          });
      }

      const updated = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: immediately ? 'CANCELLED' : 'ACTIVE',
          cancelledAt: immediately ? new Date() : null,
          scheduledCancellationAt: immediately
            ? null
            : subscription.currentPeriodEnd,
        },
        select: subscriptionSelect,
      });

      return { success: true, data: { subscription: updated } };
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription ${subscriptionId}: ${error}`,
      );
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Failed to cancel subscription',
        },
      };
    }
  }

  async pauseSubscription(
    subscriptionId: string,
    userId: string,
  ): Promise<
    SuccessResponse<{ subscription: SubscriptionResponse }> | ErrorResponse
  > {
    const ownershipError = await this.verifyOwnership(subscriptionId, userId);
    if (ownershipError) return ownershipError;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: subscriptionSelect,
    });

    if (!subscription) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      };
    }

    if (subscription.status === 'PAUSED') {
      return { success: true, data: { subscription } };
    }

    if (
      subscription.stripeSubscriptionId &&
      this.stripeService.isConfigured()
    ) {
      try {
        await this.stripeService
          .getClient()
          .subscriptions.update(subscription.stripeSubscriptionId, {
            pause_collection: {
              behavior: 'keep_as_draft',
            },
          });
      } catch (error) {
        this.logger.error(
          `Failed to pause Stripe subscription ${subscriptionId}: ${error}`,
        );
      }
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'PAUSED' },
      select: subscriptionSelect,
    });

    return { success: true, data: { subscription: updated } };
  }

  async resumeSubscription(
    subscriptionId: string,
    userId: string,
  ): Promise<
    SuccessResponse<{ subscription: SubscriptionResponse }> | ErrorResponse
  > {
    const ownershipError = await this.verifyOwnership(subscriptionId, userId);
    if (ownershipError) return ownershipError;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: subscriptionSelect,
    });

    if (!subscription) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      };
    }

    if (subscription.status !== 'PAUSED') {
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Subscription is not paused' },
      };
    }

    if (
      subscription.stripeSubscriptionId &&
      this.stripeService.isConfigured()
    ) {
      try {
        await this.stripeService
          .getClient()
          .subscriptions.update(subscription.stripeSubscriptionId, {
            pause_collection: '',
          });
      } catch (error) {
        this.logger.error(
          `Failed to resume Stripe subscription ${subscriptionId}: ${error}`,
        );
      }
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'ACTIVE' },
      select: subscriptionSelect,
    });

    return { success: true, data: { subscription: updated } };
  }
}

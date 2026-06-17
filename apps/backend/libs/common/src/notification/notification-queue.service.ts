import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import type { NotificationMessage } from '@varaperformance/core';

export const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE';
export const NOTIFICATION_QUEUE = 'notification';
export const NOTIFICATION_PATTERN = 'notification.create';

export type NotificationType =
  | 'BOOKING_REQUESTED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'MESSAGE_RECEIVED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'PROFILE_VERIFIED'
  | 'REVIEW_RECEIVED';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationQueueService {
  constructor(
    @Inject(NOTIFICATION_SERVICE) private readonly client: ClientProxy,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NotificationQueueService.name);
  }

  /**
   * Queue a notification for processing
   */
  send(input: CreateNotificationInput): void {
    try {
      const message: NotificationMessage = {
        ...input,
        timestamp: new Date().toISOString(),
      };

      void this.client.emit(NOTIFICATION_PATTERN, message);

      this.logger.debug(
        {
          type: input.type,
          userId: input.userId,
        },
        'Notification queued',
      );
    } catch (err: unknown) {
      this.logger.error({ err, input }, 'Failed to queue notification');
    }
  }

  // Helper methods for common notifications

  bookingRequested(
    coachUserId: string,
    data: { clientName: string; packageName: string; bookingId: string },
  ): void {
    this.send({
      userId: coachUserId,
      type: 'BOOKING_REQUESTED',
      title: 'New Booking Request',
      body: `${data.clientName} requested to book your ${data.packageName} package`,
      actionUrl: `/coaches/dashboard?tab=clients`,
      data: { bookingId: data.bookingId },
    });
  }

  bookingApproved(
    clientUserId: string,
    data: { coachName: string; packageName: string; bookingId: string },
  ): void {
    this.send({
      userId: clientUserId,
      type: 'BOOKING_APPROVED',
      title: 'Booking Approved',
      body: `${data.coachName} approved your booking for ${data.packageName}. Complete payment to start.`,
      actionUrl: `/my-coaching`,
      data: { bookingId: data.bookingId },
    });
  }

  bookingConfirmed(
    clientUserId: string,
    data: { coachName: string; packageName: string; bookingId: string },
  ): void {
    this.send({
      userId: clientUserId,
      type: 'BOOKING_CONFIRMED',
      title: 'Coaching Started',
      body: `Your coaching with ${data.coachName} is now active!`,
      actionUrl: `/my-coaching`,
      data: { bookingId: data.bookingId },
    });
  }

  paymentReceived(
    coachUserId: string,
    data: { clientName: string; amount: string; bookingId: string },
  ): void {
    this.send({
      userId: coachUserId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      body: `${data.clientName} paid ${data.amount} for coaching`,
      actionUrl: `/coaches/dashboard?tab=clients`,
      data: { bookingId: data.bookingId },
    });
  }

  reviewReceived(
    coachUserId: string,
    data: { clientName: string; rating: number; reviewId: string },
  ): void {
    this.send({
      userId: coachUserId,
      type: 'REVIEW_RECEIVED',
      title: 'New Review',
      body: `${data.clientName} left you a ${data.rating}-star review`,
      actionUrl: `/coaches/dashboard?tab=reviews`,
      data: { reviewId: data.reviewId },
    });
  }

  messageReceived(
    userId: string,
    data: { senderName: string; preview: string; conversationId: string },
  ): void {
    this.send({
      userId,
      type: 'MESSAGE_RECEIVED',
      title: `Message from ${data.senderName}`,
      body:
        data.preview.length > 100
          ? `${data.preview.slice(0, 100)}...`
          : data.preview,
      actionUrl: `/messages?conversation=${data.conversationId}`,
      data: { conversationId: data.conversationId },
    });
  }

  bookingCancelled(
    userId: string,
    data: { packageName: string; bookingId: string; reason?: string },
  ): void {
    this.send({
      userId,
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      body: data.reason
        ? `Your booking for ${data.packageName} was cancelled: ${data.reason}`
        : `Your booking for ${data.packageName} has been cancelled.`,
      actionUrl: `/my-coaching`,
      data: { bookingId: data.bookingId },
    });
  }

  paymentFailed(
    userId: string,
    data: { packageName: string; bookingId: string },
  ): void {
    this.send({
      userId,
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      body: `Payment for ${data.packageName} failed. Please update your payment method.`,
      actionUrl: `/my-coaching`,
      data: { bookingId: data.bookingId },
    });
  }

  subscriptionRenewed(
    userId: string,
    data: { packageName: string; amount: string; nextBillingDate: string },
  ): void {
    this.send({
      userId,
      type: 'SUBSCRIPTION_RENEWED',
      title: 'Subscription Renewed',
      body: `Your ${data.packageName} subscription renewed for ${data.amount}. Next billing: ${data.nextBillingDate}`,
      actionUrl: `/my-coaching`,
    });
  }

  subscriptionCancelled(
    userId: string,
    data: { packageName: string; endDate: string },
  ): void {
    this.send({
      userId,
      type: 'SUBSCRIPTION_CANCELLED',
      title: 'Subscription Cancelled',
      body: `Your ${data.packageName} subscription has been cancelled. Access ends on ${data.endDate}.`,
      actionUrl: `/my-coaching`,
    });
  }

  systemAnnouncement(
    userId: string,
    data: { title: string; body: string; actionUrl?: string },
  ): void {
    this.send({
      userId,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: data.title,
      body: data.body,
      actionUrl: data.actionUrl,
    });
  }

  profileVerified(userId: string): void {
    this.send({
      userId,
      type: 'PROFILE_VERIFIED',
      title: 'Profile Verified',
      body: 'Your profile has been verified! You now have access to all features.',
      actionUrl: `/profile`,
    });
  }
}

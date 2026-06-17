import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { StripeSubscriptionService } from './stripe-subscription.service';
import { NotificationService } from '../../notification/notification.service';
import { NotificationGateway } from '../../notification/notification.gateway';
import { AchievementsService } from '../../achievements/achievements.service';
import { CalendarService } from '../../calendar/calendar.service';
import { userBookingSelect } from '../selectors/payment.selector';
import type {
  ErrorResponse,
  SuccessResponse,
  BookingPaymentResult,
  BookingResponse,
  UserBookingsListData,
} from '@varaperformance/core';
import type { ClientIntake } from '../dto/payment.dto';

export interface InitiateBookingPaymentParams {
  userId: string;
  coachId: string;
  packageId: string;
  intake?: ClientIntake;
}

/**
 * Service specifically for handling coach booking and subscription payments.
 * Orchestrates the booking flow with Stripe payments.
 */
@Injectable()
export class CoachingPaymentService {
  private readonly logger = new Logger(CoachingPaymentService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly paymentService: PaymentService,
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeSubscriptionService: StripeSubscriptionService,
    private readonly encryption: EncryptionService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly achievementsService: AchievementsService,
    private readonly calendarService: CalendarService,
  ) {}

  /**
   * Create a booking request (PENDING status, no payment yet).
   * Coach must approve before user can pay.
   */
  async initiateBookingPayment(
    params: InitiateBookingPaymentParams,
  ): Promise<SuccessResponse<BookingPaymentResult> | ErrorResponse> {
    const { userId, coachId, packageId } = params;

    // Validate coach and package
    const coachPackage = await this.prisma.coachPackage.findUnique({
      where: { id: packageId },
      include: {
        coach: {
          include: {
            user: {
              select: { id: true, profile: { select: { displayName: true } } },
            },
          },
        },
      },
    });

    if (!coachPackage) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach package not found' },
      };
    }

    if (coachPackage.coachId !== coachId) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Package does not belong to this coach',
        },
      };
    }

    if (!coachPackage.isActive) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'This package is no longer available',
        },
      };
    }

    if (!coachPackage.coach.isAvailable) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Coach is not currently accepting new clients',
        },
      };
    }

    // Check for existing pending/approved booking
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        coachId,
        packageId,
        status: { in: ['PENDING', 'APPROVED', 'CONFIRMED'] },
      },
    });

    if (existingBooking) {
      if (existingBooking.status === 'CONFIRMED') {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'You already have an active booking with this coach',
          },
        };
      }
      if (existingBooking.status === 'PENDING') {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'You already have a pending request with this coach',
          },
        };
      }
      if (existingBooking.status === 'APPROVED') {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Your booking is approved! Complete payment to start.',
          },
        };
      }
    }

    // Encrypt intake data if provided
    let intakeEncryption: {
      eIntake: Uint8Array<ArrayBuffer>;
      intakeIv: Uint8Array<ArrayBuffer>;
      intakeAuthTag: Uint8Array<ArrayBuffer>;
      intakeWrappedKey: Uint8Array<ArrayBuffer>;
    } | null = null;

    if (params.intake) {
      const intakeJson = JSON.stringify(params.intake);
      const encrypted = this.encryption.encrypt(intakeJson);
      intakeEncryption = {
        eIntake: new Uint8Array(encrypted.encryptedContent),
        intakeIv: new Uint8Array(encrypted.contentIv),
        intakeAuthTag: new Uint8Array(encrypted.contentAuthTag),
        intakeWrappedKey: new Uint8Array(encrypted.wrappedKey),
      };
    }

    // Create booking request (PENDING - coach must approve)
    const referenceCode = await this.generateReferenceCode();
    const booking = await this.prisma.booking.create({
      data: {
        referenceCode,
        userId,
        coachId,
        packageId,
        status: 'PENDING',
        ...(intakeEncryption && intakeEncryption),
      },
    });
    this.logger.log(`Created booking request ${booking.id} for user ${userId}`);

    // Send notification to coach about new booking request
    try {
      const clientProfile = await this.prisma.profile.findUnique({
        where: { userId },
        select: { displayName: true },
      });
      const clientName = clientProfile?.displayName || 'A client';
      const coachUserId = coachPackage.coach.user.id;

      const notification = await this.notificationService.create({
        userId: coachUserId,
        type: 'BOOKING_REQUESTED',
        title: 'New Booking Request',
        body: `${clientName} requested to book your ${coachPackage.name} package`,
        actionUrl: `/coaches/dashboard?tab=clients`,
        data: { bookingId: booking.id },
      });
      if (notification) {
        this.notificationGateway.sendToUser(coachUserId, notification);
      }
    } catch (error) {
      this.logger.error(`Failed to send booking request notification`, error);
    }

    // Exclude encrypted intake fields from response
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      eIntake,
      intakeIv,
      intakeAuthTag,
      intakeWrappedKey,
      ...safeBooking
    } = booking;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    return {
      success: true,
      data: {
        booking: safeBooking,
        // No subscription or transactionId yet - coach must approve first
      },
    };
  }

  /**
   * Complete payment for an approved booking (called by user after coach approval).
   * Returns hosted checkout URL for Stripe Checkout.
   */
  async completeBookingPayment(
    userId: string,
    bookingId: string,
  ): Promise<
    | SuccessResponse<{
        paymentProvider: 'STRIPE';
        checkoutUrl?: string;
      }>
    | ErrorResponse
  > {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { package: true },
    });

    if (!booking) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    if (booking.userId !== userId) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your booking' },
      };
    }

    if (booking.status !== 'APPROVED') {
      if (booking.status === 'PENDING') {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Booking not yet approved by coach',
          },
        };
      }
      if (booking.status === 'CONFIRMED') {
        return {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Booking already paid' },
        };
      }
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Cannot pay for ${booking.status} booking`,
        },
      };
    }

    try {
      const stripeResult =
        await this.stripeSubscriptionService.createSubscriptionCheckout({
          userId,
          bookingId: booking.id,
          packageName: booking.package.name,
          packageDescription: booking.package.description || undefined,
          priceInCents: booking.package.priceInCents,
          billingCycle: booking.package.billingCycle,
        });

      if (!stripeResult.success) {
        return stripeResult;
      }

      return {
        success: true,
        data: {
          paymentProvider: 'STRIPE',
          checkoutUrl: stripeResult.data.checkoutUrl,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create payment for booking: ${error}`);
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Failed to setup payment',
        },
      };
    }
  }

  /**
   * Confirm a booking after successful payment (called by webhook).
   */
  async confirmBookingPayment(
    bookingId: string,
  ): Promise<SuccessResponse<{ booking: BookingResponse }> | ErrorResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        coach: {
          include: {
            user: {
              select: { id: true, profile: { select: { displayName: true } } },
            },
          },
        },
        package: true,
        user: {
          select: { id: true, profile: { select: { displayName: true } } },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    // Update booking status
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        paidAt: new Date(),
      },
    });

    // Increment coach's client count
    await this.prisma.coach.update({
      where: { id: booking.coachId },
      data: { clientCount: { increment: 1 } },
    });

    this.logger.log(`Booking ${bookingId} confirmed after payment`);

    // Check COACHING achievements (e.g. Coached Up — first session)
    const confirmedCount = await this.prisma.booking.count({
      where: { userId: booking.user.id, status: 'CONFIRMED' },
    });
    this.achievementsService
      .checkAndAward(booking.user.id, 'COACHING', confirmedCount)
      .catch(() => {});

    // Send notification to client that coaching started
    try {
      const coachName =
        booking.coach.user?.profile?.displayName || 'Your coach';
      const notification = await this.notificationService.create({
        userId: booking.user.id,
        type: 'BOOKING_CONFIRMED',
        title: 'Coaching Started',
        body: `Your coaching with ${coachName} is now active!`,
        actionUrl: `/my-coaching`,
        data: { bookingId: booking.id },
      });
      if (notification) {
        this.notificationGateway.sendToUser(booking.user.id, notification);
      }
    } catch (error) {
      this.logger.error(`Failed to send booking confirmed notification`, error);
    }

    // Send notification to coach about payment received
    try {
      const clientName = booking.user.profile?.displayName || 'A client';
      const amount = `$${(booking.package.priceInCents / 100).toFixed(2)}`;
      const coachUserId = booking.coach.user.id;

      const notification = await this.notificationService.create({
        userId: coachUserId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        body: `${clientName} paid ${amount} for ${booking.package.name}`,
        actionUrl: `/coaches/dashboard?tab=clients`,
        data: { bookingId: booking.id },
      });
      if (notification) {
        this.notificationGateway.sendToUser(coachUserId, notification);
      }
    } catch (error) {
      this.logger.error(`Failed to send payment received notification`, error);
    }

    // Auto-create a calendar event for the coaching kickoff
    try {
      const coachUserId = booking.coach.user.id;
      const clientName = booking.user.profile?.displayName || 'Client';
      const coachName = booking.coach.user?.profile?.displayName || 'Coach';
      const now = new Date();
      // Schedule kickoff 24h from now, 1-hour block
      const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      await this.calendarService.createEvent(coachUserId, {
        title: `Coaching Kickoff: ${coachName} & ${clientName}`,
        type: 'MEETING',
        visibility: 'PRIVATE',
        allDay: false,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        timezone,
        participantUserId: booking.user.id,
      });
    } catch (error) {
      this.logger.error(
        `Failed to auto-create calendar event for booking ${bookingId}`,
        error,
      );
    }

    return { success: true, data: { booking: updatedBooking } };
  }

  /**
   * Cancel a booking and its subscription.
   */
  async cancelBooking(
    userId: string,
    bookingId: string,
    reason?: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { subscription: true },
    });

    if (!booking) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    if (booking.userId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to cancel this booking',
        },
      };
    }

    if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Booking is already cancelled' },
      };
    }

    try {
      // Only cancel Stripe subscription if it exists and has a Stripe ID
      if (booking.subscription?.stripeSubscriptionId) {
        await this.subscriptionService.cancelSubscription(
          booking.subscription.id,
          undefined,
          true, // Cancel immediately
        );
      } else if (booking.subscription) {
        // Just mark local subscription as cancelled
        await this.prisma.subscription.update({
          where: { id: booking.subscription.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      }

      // Update booking status
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      // Decrement coach's client count if was confirmed
      if (booking.status === 'CONFIRMED') {
        await this.prisma.coach.update({
          where: { id: booking.coachId },
          data: { clientCount: { decrement: 1 } },
        });
      }

      this.logger.log(
        `Booking ${bookingId} cancelled by user ${userId}${reason ? `: ${reason}` : ''}`,
      );

      return { success: true, data: null };
    } catch (error) {
      this.logger.error(`Failed to cancel booking: ${error}`);
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Failed to cancel booking' },
      };
    }
  }

  /**
   * Request a refund for a booking.
   */
  async requestRefund(
    bookingId: string,
    reason?: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { subscription: true },
    });

    if (!booking) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    if (!booking.stripePaymentIntentId) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'No payment found for this booking',
        },
      };
    }

    // Find the payment record
    const payment = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        stripePaymentIntentId: booking.stripePaymentIntentId,
      },
    });

    if (payment) {
      // Use payment service to refund
      const refundResult = await this.paymentService.refundPayment(
        payment.id,
        reason || 'Customer requested refund',
      );

      if (!refundResult.success) {
        return refundResult;
      }
    }

    // Cancel subscription
    if (booking.subscription) {
      await this.subscriptionService.cancelSubscription(
        booking.subscription.id,
        undefined,
        true,
      );
    }

    // Update booking status
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'REFUNDED' },
    });

    // Decrement coach's client count
    if (booking.status === 'CONFIRMED') {
      await this.prisma.coach.update({
        where: { id: booking.coachId },
        data: { clientCount: { decrement: 1 } },
      });
    }

    this.logger.log(`Refund processed for booking ${bookingId}`);

    return { success: true, data: null };
  }

  /**
   * Get user's bookings with subscription info.
   */
  async getUserBookings(
    userId: string,
  ): Promise<SuccessResponse<UserBookingsListData> | ErrorResponse> {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      select: userBookingSelect,
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: { bookings } };
  }

  /**
   * Generate a unique booking reference code.
   */
  private async generateReferenceCode(): Promise<string> {
    const prefix = 'VP';
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).toUpperCase().slice(2, 8);

    const code = `${prefix}-${timestamp}-${random}`;

    // Ensure uniqueness
    const existing = await this.prisma.booking.findUnique({
      where: { referenceCode: code },
    });

    if (existing) {
      return this.generateReferenceCode();
    }

    return code;
  }
}

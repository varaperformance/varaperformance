import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { CoachingPaymentService } from './services/coaching-payment.service';
import { SubscriptionService } from './services/subscription.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { CoachTierSubscriptionService } from './services/coach-tier-subscription.service';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import {
  InitiateBookingPaymentDto,
  BookingIdParamsDto,
  CancelBookingDto,
  SubscriptionIdParamsDto,
  CreateStripeOnboardingLinkDto,
} from './dto/payment.dto';

@ApiTags('coaching-payments')
@Controller({
  version: '1',
  path: 'coaching/payments',
})
export class CoachingPaymentController {
  constructor(
    private readonly coachingPaymentService: CoachingPaymentService,
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly coachTierSubscriptionService: CoachTierSubscriptionService,
  ) {}

  // ============================================
  // Booking Payment Routes
  // ============================================

  @ApiOperation({ summary: 'Initiate payment for a coach booking' })
  @ApiOkResponse({
    description: 'Booking created and ready for Stripe Checkout',
  })
  @Permissions('booking:create')
  @Post('initiate')
  async initiateBookingPayment(
    @ActiveUser('sub') userId: string,
    @Body() dto: InitiateBookingPaymentDto,
  ) {
    return this.coachingPaymentService.initiateBookingPayment({
      userId,
      coachId: dto.coachId,
      packageId: dto.packageId,
      intake: dto.intake,
    });
  }

  @ApiOperation({ summary: 'Complete payment for an approved booking' })
  @ApiOkResponse({
    description: 'Stripe hosted checkout URL',
  })
  @Permissions('booking:create')
  @Post('bookings/:bookingId/pay')
  async completeBookingPayment(
    @ActiveUser('sub') userId: string,
    @Param() params: BookingIdParamsDto,
  ) {
    return this.coachingPaymentService.completeBookingPayment(
      userId,
      params.bookingId,
    );
  }

  @ApiOperation({ summary: 'Create Stripe Connect onboarding link for coach' })
  @ApiOkResponse({ description: 'Stripe onboarding link URL' })
  @Permissions('coaching:update')
  @Post('stripe/connect/onboarding-link')
  async createStripeOnboardingLink(
    @ActiveUser('sub') userId: string,
    @Body() dto: CreateStripeOnboardingLinkDto,
  ) {
    return this.stripeConnectService.createOnboardingLink(
      userId,
      dto.returnUrl,
      dto.refreshUrl,
    );
  }

  @ApiOperation({ summary: 'Get Stripe Connect account status for coach' })
  @ApiOkResponse({ description: 'Stripe Connect status' })
  @Permissions('coaching:read')
  @Get('stripe/connect/status')
  async getStripeConnectStatus(@ActiveUser('sub') userId: string) {
    return this.stripeConnectService.getStatus(userId);
  }

  @ApiOperation({ summary: 'Disconnect and delete Stripe Connect account' })
  @ApiOkResponse({ description: 'Stripe Connect account disconnected' })
  @Permissions('coaching:update')
  @Post('stripe/connect/disconnect')
  async disconnectStripeConnect(@ActiveUser('sub') userId: string) {
    return this.stripeConnectService.disconnectAccount(userId);
  }

  @ApiOperation({ summary: 'Get user bookings with subscription info' })
  @ApiOkResponse({ description: 'List of user bookings' })
  @Permissions('booking:read')
  @Get('bookings')
  async getUserBookings(@ActiveUser('sub') userId: string) {
    return this.coachingPaymentService.getUserBookings(userId);
  }

  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiOkResponse({ description: 'Booking cancelled' })
  @Permissions('booking:cancel')
  @Post('bookings/:bookingId/cancel')
  async cancelBooking(
    @ActiveUser('sub') userId: string,
    @Param() params: BookingIdParamsDto,
    @Body() dto: CancelBookingDto,
  ) {
    return this.coachingPaymentService.cancelBooking(
      userId,
      params.bookingId,
      dto.reason,
    );
  }

  // ============================================
  // Subscription Routes
  // ============================================

  @ApiOperation({ summary: 'Pause a subscription' })
  @ApiOkResponse({ description: 'Subscription paused' })
  @Permissions('subscription:update')
  @Post('subscriptions/:subscriptionId/pause')
  async pauseSubscription(
    @ActiveUser('sub') userId: string,
    @Param() params: SubscriptionIdParamsDto,
  ) {
    return this.subscriptionService.pauseSubscription(
      params.subscriptionId,
      userId,
    );
  }

  @ApiOperation({ summary: 'Resume a paused subscription' })
  @ApiOkResponse({ description: 'Subscription resumed' })
  @Permissions('subscription:update')
  @Post('subscriptions/:subscriptionId/resume')
  async resumeSubscription(
    @ActiveUser('sub') userId: string,
    @Param() params: SubscriptionIdParamsDto,
  ) {
    return this.subscriptionService.resumeSubscription(
      params.subscriptionId,
      userId,
    );
  }

  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiOkResponse({ description: 'Subscription cancelled' })
  @Permissions('subscription:update')
  @Post('subscriptions/:subscriptionId/cancel')
  async cancelSubscription(
    @ActiveUser('sub') userId: string,
    @Param() params: SubscriptionIdParamsDto,
  ) {
    return this.subscriptionService.cancelSubscription(
      params.subscriptionId,
      userId,
      false, // Cancel at period end
    );
  }

  // ============================================
  // Coach Tier Subscription Routes
  // ============================================

  @ApiOperation({ summary: 'Get coach tier subscription status' })
  @ApiOkResponse({ description: 'Coach tier subscription' })
  @Permissions('coaching:read')
  @Get('tier-subscription')
  async getTierSubscription(@ActiveUser('sub') userId: string) {
    return this.coachTierSubscriptionService.getTierSubscription(userId);
  }

  @ApiOperation({
    summary: 'Create Stripe Checkout for coach tier subscription',
  })
  @ApiOkResponse({ description: 'Stripe checkout URL' })
  @Permissions('coaching:update')
  @Post('tier-subscription/checkout')
  async createTierSubscriptionCheckout(@ActiveUser('sub') userId: string) {
    return this.coachTierSubscriptionService.createCheckout(userId);
  }

  @ApiOperation({ summary: 'Check if coach can cancel tier subscription' })
  @ApiOkResponse({ description: 'Cancel eligibility' })
  @Permissions('coaching:read')
  @Get('tier-subscription/cancel-eligibility')
  async getTierCancelEligibility(@ActiveUser('sub') userId: string) {
    return this.coachTierSubscriptionService.getCancelEligibility(userId);
  }

  @ApiOperation({ summary: 'Cancel coach tier subscription at period end' })
  @ApiOkResponse({ description: 'Subscription scheduled for cancellation' })
  @Permissions('coaching:update')
  @Post('tier-subscription/cancel')
  async cancelTierSubscription(@ActiveUser('sub') userId: string) {
    return this.coachTierSubscriptionService.cancelTierSubscription(userId);
  }
}

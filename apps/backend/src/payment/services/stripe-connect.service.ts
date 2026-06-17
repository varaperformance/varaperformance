import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { SecretsService } from '@app/common/secrets';
import { StripeService } from './stripe.service';
import type { ErrorResponse, SuccessResponse } from '@varaperformance/core';
import { BookingStatus, SubscriptionStatus } from '@generated/prisma';

export interface StripeConnectStatus {
  stripeAccountId: string | null;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly stripeService: StripeService,
    private readonly secrets: SecretsService,
  ) {}

  async createOnboardingLink(
    userId: string,
    returnUrl?: string,
    refreshUrl?: string,
  ): Promise<SuccessResponse<{ url: string }> | ErrorResponse> {
    if (!this.stripeService.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Stripe is not configured',
        },
      };
    }

    const coach = await this.prisma.coach.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!coach) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const stripe = this.stripeService.getClient();

    let accountId = coach.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: coach.user.email,
        country: this.secrets.get('STRIPE_CONNECT_COUNTRY') || 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          coachId: coach.id,
          userId,
        },
      });

      accountId = account.id;
      await this.prisma.coach.update({
        where: { id: coach.id },
        data: {
          stripeAccountId: account.id,
          stripeOnboardingComplete: Boolean(account.details_submitted),
          stripeChargesEnabled: Boolean(account.charges_enabled),
          stripePayoutsEnabled: Boolean(account.payouts_enabled),
        },
      });

      this.logger.log(
        `Created Stripe Connect account ${account.id} for coach ${coach.id}`,
      );
    }

    const defaultFrontend =
      this.secrets.get('WEB_ORIGIN') ||
      this.secrets.get('APP_WEB_URL') ||
      this.secrets.get('FRONTEND_URL');

    if (!defaultFrontend) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Frontend origin is not configured',
        },
      };
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      return_url:
        returnUrl || `${defaultFrontend}/coaches/dashboard?stripe=connected`,
      refresh_url:
        refreshUrl || `${defaultFrontend}/coaches/dashboard?stripe=refresh`,
    });

    return {
      success: true,
      data: {
        url: accountLink.url,
      },
    };
  }

  async getStatus(
    userId: string,
  ): Promise<SuccessResponse<StripeConnectStatus> | ErrorResponse> {
    const coach = await this.prisma.coach.findUnique({
      where: { userId },
      select: {
        id: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
      },
    });

    if (!coach) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    if (coach.stripeAccountId && this.stripeService.isConfigured()) {
      try {
        const account = await this.stripeService
          .getClient()
          .accounts.retrieve(coach.stripeAccountId);

        await this.prisma.coach.update({
          where: { id: coach.id },
          data: {
            stripeOnboardingComplete: Boolean(account.details_submitted),
            stripeChargesEnabled: Boolean(account.charges_enabled),
            stripePayoutsEnabled: Boolean(account.payouts_enabled),
          },
        });

        return {
          success: true,
          data: {
            stripeAccountId: coach.stripeAccountId,
            onboardingComplete: Boolean(account.details_submitted),
            chargesEnabled: Boolean(account.charges_enabled),
            payoutsEnabled: Boolean(account.payouts_enabled),
          },
        };
      } catch (error) {
        this.logger.error(
          `Failed to refresh Stripe account status for coach ${coach.id}: ${error}`,
        );
      }
    }

    return {
      success: true,
      data: {
        stripeAccountId: coach.stripeAccountId,
        onboardingComplete: coach.stripeOnboardingComplete,
        chargesEnabled: coach.stripeChargesEnabled,
        payoutsEnabled: coach.stripePayoutsEnabled,
      },
    };
  }

  async disconnectAccount(
    userId: string,
  ): Promise<SuccessResponse<{ disconnected: boolean }> | ErrorResponse> {
    const coach = await this.prisma.coach.findUnique({
      where: { userId },
      select: {
        id: true,
        stripeAccountId: true,
      },
    });

    if (!coach) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const activeSubscriptionCount = await this.prisma.booking.count({
      where: {
        coachId: coach.id,
        status: BookingStatus.CONFIRMED,
        subscription: {
          is: {
            status: {
              in: [
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PAUSED,
                SubscriptionStatus.PAST_DUE,
              ],
            },
          },
        },
      },
    });

    if (activeSubscriptionCount > 0) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message:
            'Disconnect unavailable while you have active client subscriptions',
        },
      };
    }

    if (coach.stripeAccountId && this.stripeService.isConfigured()) {
      try {
        await this.stripeService
          .getClient()
          .accounts.del(coach.stripeAccountId);
      } catch (error) {
        this.logger.error(
          `Failed to delete Stripe Connect account ${coach.stripeAccountId} for coach ${coach.id}: ${error}`,
        );
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message:
              'Unable to disconnect Stripe account right now. Resolve pending payouts/balance and try again.',
          },
        };
      }
    }

    await this.prisma.coach.update({
      where: { id: coach.id },
      data: {
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
      },
    });

    return {
      success: true,
      data: {
        disconnected: true,
      },
    };
  }
}

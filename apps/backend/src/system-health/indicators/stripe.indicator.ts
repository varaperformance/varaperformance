import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { StripeService } from '../../payment/services/stripe.service';

@Injectable()
export class StripeHealthIndicator extends HealthIndicator {
  constructor(private readonly stripeService: StripeService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      if (!this.stripeService.isConfigured()) {
        throw new Error('Stripe is not configured');
      }

      // Validate API credentials by making a lightweight authenticated request.
      const stripe = this.stripeService.getClient();
      await stripe.balance.retrieve();

      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Stripe check failed',
        this.getStatus(key, false, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}

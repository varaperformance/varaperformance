import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecretsService } from '@app/common/secrets';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  private stripe!: Stripe;

  constructor(private readonly secrets: SecretsService) {}

  onModuleInit() {
    const secretKey = this.secrets.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not configured');
      return;
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });

    this.logger.log('Stripe SDK initialized');
  }

  isConfigured(): boolean {
    return Boolean(this.stripe);
  }

  getClient(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    return this.stripe;
  }

  getWebhookSecret(): string {
    return this.secrets.getOrThrow('STRIPE_WEBHOOK_SECRET');
  }
}

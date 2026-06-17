import { Module } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { NotificationModule } from '../notification/notification.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { CalendarModule } from '../calendar/calendar.module';
import { PaymentService } from './services/payment.service';
import { SubscriptionService } from './services/subscription.service';
import { CoachingPaymentService } from './services/coaching-payment.service';
import { StripeService } from './services/stripe.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { StripeSubscriptionService } from './services/stripe-subscription.service';
import { StripeWebhookService } from './services/stripe-webhook.service';
import { CoachTierSubscriptionService } from './services/coach-tier-subscription.service';
import { PaymentController } from './payment.controller';
import { CoachingPaymentController } from './coaching-payment.controller';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [
    SecurityModule,
    NotificationModule,
    AchievementsModule,
    CalendarModule,
  ],
  controllers: [
    PaymentController,
    CoachingPaymentController,
    WebhookController,
  ],
  providers: [
    StripeService,
    PaymentService,
    SubscriptionService,
    StripeConnectService,
    StripeSubscriptionService,
    CoachingPaymentService,
    StripeWebhookService,
    CoachTierSubscriptionService,
  ],
  exports: [
    StripeService,
    PaymentService,
    SubscriptionService,
    StripeConnectService,
    StripeSubscriptionService,
    CoachingPaymentService,
    StripeWebhookService,
    CoachTierSubscriptionService,
  ],
})
export class PaymentModule {}

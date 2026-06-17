import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger as NestLogger,
  Module,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@app/database';
import { LoggerModule } from '@app/common/logger';
import { AuditModule, AuditInterceptor } from '@app/common/audit';
import { AvatarModule } from '@app/common/avatar';
import { FoodSearchModule } from '@app/common/food-search';
import { StorageModule } from '@app/common/storage';
import { MailModule } from '@app/common/mailer';
import { SecretsModule } from '@app/common/secrets';
import { NotificationQueueModule } from '@app/common/notification';
import { IdmModule } from './idm/idm.module';
import { ThemeModule } from './theme/theme.module';
import {
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  BaseExceptionFilter,
} from '@nestjs/core';
import { AccessTokenGuard } from './idm/guards/authentication/authentication.guard';
import { AuthorizationGuard } from './idm/guards/authorization/authorization.guard';
import { ThrottleGuard } from './idm/guards/throttle/throttle.guard';
import {
  ZodSerializationException,
  ZodSerializerInterceptor,
  ZodValidationPipe,
} from 'nestjs-zod';
import { ZodError } from 'zod/v3';
import { StatusModule } from './status/status.module';
import { BlogModule } from './blog/blog.module';
import { ProfileModule } from './profile/profile.module';
import { DashboardModule } from './profile/dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { ConsentModule } from './consent/consent.module';
import { PaymentModule } from './payment/payment.module';
import { CoachingModule } from './coaching/coaching.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';
import { FaqModule } from './faq/faq.module';
import { SystemHealthModule } from './system-health/system-health.module';
import { ElevateModule } from './elevate/elevate.module';
import { ClimbModule } from './climb/climb.module';
import { SpotlightModule } from './spotlight/spotlight.module';
import { CalendarModule } from './calendar/calendar.module';
import { ContactModule } from './contact/contact.module';
import { TeamModule } from './team/team.module';
import { CommerceModule } from './commerce/commerce.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ReleaseNotesModule } from './release-notes/release-notes.module';
import { PrivacyModule } from './privacy/privacy.module';
import { BreachModule } from './breach/breach.module';
import { AchievementsModule } from './achievements/achievements.module';
import { MarketingModule } from './marketing/marketing.module';
import { ChallengeModule } from './challenge/challenge.module';
import { PerformanceMetricsModule } from './performance-metrics/performance-metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SecretsModule, // Must be early - other modules depend on secrets
    LoggerModule,
    DatabaseModule,
    AuditModule,
    AvatarModule,
    FoodSearchModule,
    StorageModule,
    MailModule,
    NotificationQueueModule,
    IdmModule,
    ThemeModule,
    // Every named throttler is checked against EVERY request unless
    // explicitly skipped.  Only register throttlers whose default limits
    // are safe to apply globally.  Endpoint-specific limits are set via
    // inline @Throttle({ default: { ttl, limit } }) overrides.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 240,
      },
    ]),
    StatusModule,
    BlogModule,
    ProfileModule,
    DashboardModule,
    HealthModule,
    ConsentModule,
    PaymentModule,
    CoachingModule,
    MessagingModule,
    NotificationModule,
    AdminModule,
    FaqModule,
    SystemHealthModule,
    ElevateModule,
    ClimbModule,
    SpotlightModule,
    CalendarModule,
    ContactModule,
    TeamModule,
    CommerceModule,
    IntegrationsModule,
    ReleaseNotesModule,
    PrivacyModule,
    BreachModule,
    AchievementsModule,
    MarketingModule,
    ChallengeModule,
    PerformanceMetricsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottleGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}

// http-exception.filter
@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new NestLogger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        this.logger.error(`ZodSerializationException: ${zodError.message}`);
      }
    }

    super.catch(exception, host);
  }
}

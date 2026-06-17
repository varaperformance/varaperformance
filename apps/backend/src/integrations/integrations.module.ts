import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from '@app/security';
import { WeightModule } from '../health/weight/weight.module';
import { HealthIntegrationModule } from './health/health.module';
import stravaConfig from './config/strava.config';
import withingsConfig from './config/withings.config';
import { StravaIntegrationController } from './strava-integration.controller';
import { StravaIntegrationService } from './strava-integration.service';
import { WithingsIntegrationController } from './withings-integration.controller';
import { WithingsIntegrationService } from './withings-integration.service';

@Module({
  imports: [
    SecurityModule,
    WeightModule,
    HealthIntegrationModule,
    ConfigModule.forFeature(stravaConfig),
    ConfigModule.forFeature(withingsConfig),
  ],
  controllers: [StravaIntegrationController, WithingsIntegrationController],
  providers: [StravaIntegrationService, WithingsIntegrationService],
  exports: [StravaIntegrationService, WithingsIntegrationService],
})
export class IntegrationsModule {}

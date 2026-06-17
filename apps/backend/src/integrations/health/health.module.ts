import { Module } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { HealthTokenService } from './health-token.service';
import { HealthSyncService } from './health-sync.service';
import { HealthSyncQueueModule } from './health-sync-queue.module';
import { HealthInternalController } from './health-internal.controller';
import { ProviderRateLimiter } from './provider-rate-limiter';

@Module({
  imports: [SecurityModule, HealthSyncQueueModule],
  controllers: [HealthInternalController],
  providers: [HealthTokenService, HealthSyncService, ProviderRateLimiter],
  exports: [
    HealthTokenService,
    HealthSyncService,
    HealthSyncQueueModule,
    ProviderRateLimiter,
  ],
})
export class HealthIntegrationModule {}

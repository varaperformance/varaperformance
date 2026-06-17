import { Module } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { HealthDataService } from './health-data.service';
import { HealthDataController } from './health-data.controller';

@Module({
  imports: [SecurityModule],
  controllers: [HealthDataController],
  providers: [HealthDataService],
  exports: [HealthDataService],
})
export class HealthDataModule {}

import { Module } from '@nestjs/common';
import { PerformanceMetricsController } from './performance-metrics.controller';
import { PerformanceMetricsService } from './performance-metrics.service';

@Module({
  controllers: [PerformanceMetricsController],
  providers: [PerformanceMetricsService],
})
export class PerformanceMetricsModule {}

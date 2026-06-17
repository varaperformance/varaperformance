import { Module } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { WeeklyReportService } from './weekly-report.service';
import { WeeklyReportController } from './weekly-report.controller';

@Module({
  imports: [SecurityModule],
  controllers: [WeeklyReportController],
  providers: [WeeklyReportService],
  exports: [WeeklyReportService],
})
export class WeeklyReportModule {}

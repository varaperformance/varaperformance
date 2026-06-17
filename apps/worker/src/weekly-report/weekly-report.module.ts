import { Module } from "@nestjs/common";
import { SecurityModule } from "@app/security";
import { WeeklyReportService } from "./weekly-report.service";

@Module({
  imports: [SecurityModule],
  providers: [WeeklyReportService],
  exports: [WeeklyReportService],
})
export class WeeklyReportModule {}

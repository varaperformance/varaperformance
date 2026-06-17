import { MailModule } from "@app/common/mailer";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { ScheduleModule } from "@nestjs/schedule";
import { SecretsModule } from "@app/common/secrets";
import { validate } from "./config/env.validation";
import { WorkerDatabaseModule } from "./database/worker-database.module";
import { AuditModule } from "./audit/audit.module";
import { NotificationModule } from "./notification/notification.module";
import { HealthMonitorModule } from "./health-monitor/health-monitor.module";
import { MomentumModule } from "./momentum/momentum.module";
import { StackTipsModule } from "./stack-tips/stack-tips.module";
import { SiteStatsModule } from "./site-stats/site-stats.module";
import { AdherenceRemindersModule } from "./adherence-reminders/adherence-reminders.module";
import { HealthSyncModule } from "./health-sync/health-sync.module";
import { WorkoutQuoteModule } from "./workout-quote/workout-quote.module";
import { ExerciseDescriptionsModule } from "./exercise-descriptions/exercise-descriptions.module";
import { DataRetentionModule } from "./data-retention/data-retention.module";
import { WeeklyReportModule } from "./weekly-report/weekly-report.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    LoggerModule.forRoot(),
    ScheduleModule.forRoot(),
    SecretsModule,
    WorkerDatabaseModule,
    MailModule,
    AuditModule,
    NotificationModule,
    HealthMonitorModule,
    MomentumModule,
    StackTipsModule,
    SiteStatsModule,
    AdherenceRemindersModule,
    HealthSyncModule,
    WorkoutQuoteModule,
    ExerciseDescriptionsModule,
    DataRetentionModule,
    WeeklyReportModule,
  ],
})
export class AppModule {}

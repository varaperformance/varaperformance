import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { HealthMonitorService } from "./health-monitor.service";
import { WorkerDatabaseModule } from "../database/worker-database.module";

@Module({
  imports: [ConfigModule, HttpModule, WorkerDatabaseModule],
  providers: [HealthMonitorService],
})
export class HealthMonitorModule {}

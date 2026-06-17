import { Module } from "@nestjs/common";
import { HealthSyncConsumer } from "./health-sync.consumer";
import { HealthSyncSchedulerService } from "./health-sync-scheduler.service";

@Module({
  controllers: [HealthSyncConsumer],
  providers: [HealthSyncSchedulerService],
})
export class HealthSyncModule {}

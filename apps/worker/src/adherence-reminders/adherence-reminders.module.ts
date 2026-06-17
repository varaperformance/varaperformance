import { Module } from "@nestjs/common";
import { AdherenceRemindersService } from "./adherence-reminders.service";

@Module({
  providers: [AdherenceRemindersService],
})
export class AdherenceRemindersModule {}

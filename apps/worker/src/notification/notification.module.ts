import { Module } from "@nestjs/common";
import { NotificationConsumer } from "./notification.consumer";
import { NotificationDigestService } from "./notification-digest.service";
import { SessionReminderService } from "./session-reminder.service";

@Module({
  controllers: [NotificationConsumer],
  providers: [NotificationDigestService, SessionReminderService],
})
export class NotificationModule {}

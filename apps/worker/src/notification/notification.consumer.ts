import { Controller, Logger } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { DatabaseService } from "@app/database";
import type { Prisma } from "@generated/prisma";
import axios from "axios";
import type { NotificationType } from "@varaperformance/core";
import {
  NOTIFICATION_TYPE_TO_CATEGORY,
  NotificationMessageSchema,
} from "@varaperformance/core";

export const NOTIFICATION_PATTERN = "notification.create";

const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  "BOOKING_REQUESTED",
  "BOOKING_APPROVED",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "MESSAGE_RECEIVED",
  "PAYMENT_RECEIVED",
  "PAYMENT_FAILED",
  "SUBSCRIPTION_RENEWED",
  "SUBSCRIPTION_CANCELLED",
  "GYM_PARTNER_REQUEST",
  "GYM_PARTNER_ACCEPTED",
  "WORKOUT_PLAN_ASSIGNED",
  "ORDER_CONFIRMED",
  "ORDER_SHIPPED",
  "ORDER_REFUNDED",
  "POST_COMMENT_RECEIVED",
  "POST_HIGH_FIVED",
  "AMBASSADOR_APPLICATION_APPROVED",
  "AMBASSADOR_APPLICATION_DENIED",
  "STACK_REMINDER",
  "INJECTION_REMINDER",
  "CLIMB_REMINDER",
  "SESSION_REMINDER",
  "SYSTEM_ANNOUNCEMENT",
  "PROFILE_VERIFIED",
  "REVIEW_RECEIVED",
];

const INTERNAL_PUSH_TIMEOUT_MS = 3000;

function isValidNotificationType(type: string): type is NotificationType {
  return VALID_NOTIFICATION_TYPES.includes(type as NotificationType);
}

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly db: DatabaseService) {}

  @EventPattern(NOTIFICATION_PATTERN)
  async handleNotification(
    @Payload() raw: unknown,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const parsed = NotificationMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error(
        { errors: parsed.error.issues, raw },
        "Invalid notification payload — routing to DLQ",
      );
      channel.nack(originalMsg, false, false);
      return;
    }
    const data = parsed.data;

    this.logger.debug(data, "Processing notification");

    try {
      if (!isValidNotificationType(data.type)) {
        this.logger.warn({ type: data.type }, "Invalid notification type");
        channel.ack(originalMsg);
        return;
      }

      // Deduplicate: if an idempotencyKey is provided, check for existing record
      const idempotencyKey =
        data.idempotencyKey ??
        `${data.userId}:${data.type}:${data.timestamp ?? Date.now()}`;

      const existing = await this.db.notification.findFirst({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        this.logger.debug({ idempotencyKey }, "Duplicate notification skipped");
        channel.ack(originalMsg);
        return;
      }

      // Check user notification preferences before persisting
      if (await this.isSuppressedByPreference(data.userId, data.type)) {
        this.logger.debug(
          { type: data.type, userId: data.userId },
          "Notification suppressed by user preference",
        );
        channel.ack(originalMsg);
        return;
      }

      // Create notification in database
      const notification = await this.db.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          body: data.body,
          actionUrl: data.actionUrl,
          data: data.data as Prisma.InputJsonValue,
          idempotencyKey,
        },
      });

      this.logger.debug(
        { notificationId: notification.id },
        "Notification persisted",
      );

      await this.pushNotificationRealtime(notification.id);

      channel.ack(originalMsg);
    } catch (err) {
      this.logger.error({ err, data }, "Failed to process notification");

      // First failure is retried once, then routed to DLQ via queue dead-letter args.
      if (originalMsg.fields.redelivered) {
        this.logger.warn(
          {
            type: data.type,
            userId: data.userId,
          },
          "Notification failed after retry and was sent to DLQ",
        );
        channel.nack(originalMsg, false, false);
        return;
      }

      channel.nack(originalMsg, false, true);
    }
  }

  private async pushNotificationRealtime(
    notificationId: string,
  ): Promise<void> {
    const backendUrl = process.env.BACKEND_URL?.trim();
    const internalApiKey = process.env.INTERNAL_API_KEY?.trim();

    if (!backendUrl || !internalApiKey) {
      this.logger.debug(
        "Skipping realtime push because BACKEND_URL or INTERNAL_API_KEY is not configured",
      );
      return;
    }

    try {
      const url = `${backendUrl.replace(/\/$/, "")}/v1/notifications/internal/push`;
      await axios.post(
        url,
        { notificationId },
        {
          timeout: INTERNAL_PUSH_TIMEOUT_MS,
          headers: {
            "x-internal-api-key": internalApiKey,
          },
        },
      );
    } catch (err) {
      this.logger.warn(
        {
          notificationId,
          err,
        },
        "Notification persisted but realtime push failed",
      );
    }
  }

  /**
   * Check if a notification type is suppressed by user preference.
   */
  private async isSuppressedByPreference(
    userId: string,
    type: string,
  ): Promise<boolean> {
    const categoryKey = NOTIFICATION_TYPE_TO_CATEGORY[type];
    if (!categoryKey) return false;

    const prefs = await this.db.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) return false;
    if (!prefs.inApp) return true;
    return prefs[categoryKey] === false;
  }
}

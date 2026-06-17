import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import axios from "axios";
import { DatabaseService } from "@app/database";
import { MailService } from "@app/common/mailer";
import { Prisma } from "@generated/prisma";
import { getTodayInTimezone } from "@varaperformance/core";

const DIGEST_CRON = "0 5 * * * *";
const DIGEST_MIN_UNREAD = Number(
  process.env.NOTIFICATION_DIGEST_MIN_UNREAD ?? "3",
);
const DIGEST_HOUR = Number(process.env.NOTIFICATION_DIGEST_HOUR ?? "8");
const PUSH_TIMEOUT_MS = 3000;

@Injectable()
export class NotificationDigestService {
  private readonly logger = new Logger(NotificationDigestService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  @Cron(DIGEST_CRON)
  async processDailyDigests(): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const unreadByUser = await this.db.notification.groupBy({
      by: ["userId"],
      where: {
        read: false,
        createdAt: { gte: since },
      },
      _count: {
        _all: true,
      },
    });

    const eligibleRows = unreadByUser.filter(
      (row) => row._count._all >= DIGEST_MIN_UNREAD,
    );

    const profiles = await this.db.profile.findMany({
      where: { userId: { in: eligibleRows.map((r) => r.userId) } },
      select: { userId: true, timezone: true, displayName: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Fetch user emails for digest delivery
    const users = await this.db.user.findMany({
      where: { id: { in: eligibleRows.map((r) => r.userId) } },
      select: { id: true, email: true },
    });
    const emailMap = new Map(users.map((u) => [u.id, u.email]));

    // Fetch notification preferences to skip users who disabled digests or system announcements
    const preferences = await this.db.notificationPreference.findMany({
      where: { userId: { in: eligibleRows.map((r) => r.userId) } },
      select: { userId: true, digest: true, systemAnnouncements: true },
    });
    const prefMap = new Map(preferences.map((p) => [p.userId, p]));

    for (const row of eligibleRows) {
      const unreadCount = row._count._all;

      const profile = profileMap.get(row.userId);
      const timezone = profile?.timezone ?? "UTC";
      if (this.getHourInTimezone(timezone) !== DIGEST_HOUR) {
        continue;
      }

      // Skip users who disabled digest channel or system announcements
      const userPref = prefMap.get(row.userId);
      if (
        userPref?.digest === false ||
        userPref?.systemAnnouncements === false
      ) {
        continue;
      }

      const todayKey = getTodayInTimezone(timezone);
      const idempotencyKey = `digest:daily:${row.userId}:${todayKey}`;

      try {
        const digest = await this.db.notification.create({
          data: {
            userId: row.userId,
            type: "SYSTEM_ANNOUNCEMENT",
            title: "Your daily notification digest",
            body: `You have ${unreadCount} unread notifications from the last 24 hours. Open Notifications to review them.`,
            actionUrl: "/notifications",
            idempotencyKey,
            data: {
              source: "worker:notification-digest",
              unreadCount,
              date: todayKey,
            },
          },
          select: { id: true },
        });
        await this.pushNotificationRealtime(digest.id);

        // Send digest email
        const email = emailMap.get(row.userId);
        if (email) {
          try {
            const recentNotifications = await this.db.notification.findMany({
              where: {
                userId: row.userId,
                read: false,
                createdAt: { gte: since },
                id: { not: digest.id },
              },
              select: { title: true, body: true, actionUrl: true },
              orderBy: { createdAt: "desc" },
              take: 10,
            });

            await this.mailService.sendNotificationDigestEmail({
              email,
              name: profile?.displayName || undefined,
              userId: row.userId,
              unreadCount,
              notifications: recentNotifications,
            });
          } catch (emailErr) {
            this.logger.warn(
              { userId: row.userId, err: emailErr },
              "Digest in-app notification created but email delivery failed",
            );
          }
        }
      } catch (error) {
        // P2002 = unique constraint violation for idempotencyKey.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }
  }

  private async pushNotificationRealtime(
    notificationId: string,
  ): Promise<void> {
    const backendUrl = process.env.BACKEND_URL?.trim();
    const internalApiKey = process.env.INTERNAL_API_KEY?.trim();

    if (!backendUrl || !internalApiKey) {
      this.logger.debug(
        "Skipping digest realtime push because BACKEND_URL or INTERNAL_API_KEY is not configured",
      );
      return;
    }

    try {
      const url = `${backendUrl.replace(/\/$/, "")}/v1/notifications/internal/push`;
      await axios.post(
        url,
        { notificationId },
        {
          timeout: PUSH_TIMEOUT_MS,
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
        "Digest notification persisted but realtime push failed",
      );
    }
  }

  private getHourInTimezone(timezone: string): number {
    const value = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    }).format(new Date());

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}

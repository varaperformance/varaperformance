import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { DatabaseService } from "@app/database";

const SESSION_REMINDER_LOCK_KEY = 1_904_030;
const REMINDER_LEAD_MINUTES = 60;

@Injectable()
export class SessionReminderService {
  private readonly logger = new Logger(SessionReminderService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Runs every 15 minutes to send reminders for sessions starting within the next hour */
  @Cron("0 */15 * * * *")
  async sendSessionReminders(): Promise<void> {
    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${SESSION_REMINDER_LOCK_KEY}) AS acquired
    `;
    if (!lockRows[0]?.acquired) {
      return;
    }

    try {
      await this.processReminders();
    } finally {
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${SESSION_REMINDER_LOCK_KEY})
      `;
    }
  }

  private async processReminders(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(
      now.getTime() + REMINDER_LEAD_MINUTES * 60 * 1000,
    );

    // Find upcoming meetings that start within the reminder window
    const events = await this.db.calendarEvent.findMany({
      where: {
        type: "MEETING",
        startAt: {
          gte: now,
          lte: windowEnd,
        },
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        ownerUserId: true,
        participantUserId: true,
      },
    });

    if (events.length === 0) return;

    // Deduplicate — only send one reminder per event per user
    const eventIds = events.map((e: { id: string }) => e.id);
    const alreadySent = await this.db.notification.findMany({
      where: {
        type: "SESSION_REMINDER",
        data: { path: ["calendarEventId"], array_contains: eventIds },
      },
      select: {
        userId: true,
        data: true,
      },
    });

    const sentKeys = new Set(
      alreadySent.map((n: { userId: string; data: unknown }) => {
        const data = n.data as Record<string, string> | null;
        return `${n.userId}:${data?.calendarEventId ?? ""}`;
      }),
    );

    let sentCount = 0;

    for (const event of events) {
      const minutesUntil = Math.round(
        (event.startAt.getTime() - now.getTime()) / 60_000,
      );
      const userIds = [event.ownerUserId, event.participantUserId].filter(
        Boolean,
      ) as string[];

      for (const userId of userIds) {
        const key = `${userId}:${event.id}`;
        if (sentKeys.has(key)) continue;

        await this.db.notification.create({
          data: {
            userId,
            type: "SESSION_REMINDER",
            title: "Upcoming session",
            body: `Your session "${event.title}" starts in ${minutesUntil} minutes.`,
            actionUrl: "/calendar",
            data: { calendarEventId: event.id },
          },
        });
        sentKeys.add(key);
        sentCount++;
      }
    }

    if (sentCount > 0) {
      this.logger.log(`Sent ${sentCount} session reminder(s)`);
    }
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  createUtcDateKey,
  getTodayInTimezone,
  formatDateInTimezone,
} from "@varaperformance/core";
import { DatabaseService } from "@app/database";

type Slot = "MORNING" | "AFTERNOON" | "EVENING";

const SLOT_START_HOURS: Record<Slot, number> = {
  MORNING: 11,
  AFTERNOON: 16,
  EVENING: 21,
};

const LOOKBACK_HOURS = 48;
const USER_BATCH_SIZE = 250;
const ADHERENCE_REMINDER_LOCK_KEY = 1_904_021;
const CLIMB_REMINDER_START_HOUR = 19;

@Injectable()
export class AdherenceRemindersService {
  private readonly logger = new Logger(AdherenceRemindersService.name);

  constructor(private readonly db: DatabaseService) {}

  @Cron("0 12 * * * *")
  async runAdherenceReminders(): Promise<void> {
    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${ADHERENCE_REMINDER_LOCK_KEY}) AS acquired
    `;
    const acquired = lockRows[0]?.acquired === true;

    if (!acquired) {
      this.logger.debug(
        "Skipping adherence reminder run because another scheduler instance holds the lock",
      );
      return;
    }

    try {
      await Promise.all([
        this.sendStackSlotReminders(),
        this.sendDailyInjectionReminders(),
        this.sendDailyClimbSelfieReminders(),
      ]);
    } finally {
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${ADHERENCE_REMINDER_LOCK_KEY})
      `;
    }
  }

  private async sendStackSlotReminders(): Promise<void> {
    const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    let sentCount = 0;

    let cursor: string | undefined;
    while (true) {
      const users = await this.db.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          stacks: {
            some: {
              isActive: true,
              items: {
                some: {
                  timeSlot: { in: ["MORNING", "AFTERNOON", "EVENING"] },
                },
              },
            },
          },
        },
        select: {
          id: true,
          profile: {
            select: {
              timezone: true,
            },
          },
          stacks: {
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              name: true,
              items: {
                where: {
                  timeSlot: { in: ["MORNING", "AFTERNOON", "EVENING"] },
                },
                select: {
                  id: true,
                  timeSlot: true,
                },
              },
            },
          },
        },
        orderBy: { id: "asc" },
        take: USER_BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
      });

      if (users.length === 0) {
        break;
      }

      const userContexts = users
        .map((user) => {
          const timezone = user.profile?.timezone || "UTC";
          const todayKey = getTodayInTimezone(timezone);
          const localHour = this.getHourInTimezone(timezone);
          const dueSlots = this.getDueSlots(localHour);
          const activeStack = user.stacks[0];

          if (!activeStack || dueSlots.length === 0) {
            return null;
          }

          return {
            user,
            timezone,
            todayKey,
            dueSlots,
            activeStack,
          };
        })
        .filter((ctx) => ctx !== null);

      if (userContexts.length === 0) {
        cursor = users[users.length - 1]?.id;
        continue;
      }

      const userIds = userContexts.map((ctx) => ctx.user.id);
      const timezoneByUser = new Map(
        userContexts.map((ctx) => [ctx.user.id, ctx.timezone]),
      );
      const todayKeyByUser = new Map(
        userContexts.map((ctx) => [ctx.user.id, ctx.todayKey]),
      );

      const existingNotifications = await this.db.notification.findMany({
        where: {
          userId: { in: userIds },
          type: { in: ["STACK_REMINDER", "SYSTEM_ANNOUNCEMENT"] },
          actionUrl: "/stack",
          createdAt: { gte: cutoff },
        },
        select: {
          userId: true,
          title: true,
          createdAt: true,
        },
      });

      const existingTitlesByUser = new Map<string, Set<string>>();
      for (const notification of existingNotifications) {
        const timezone = timezoneByUser.get(notification.userId);
        const todayKey = todayKeyByUser.get(notification.userId);
        if (!timezone || !todayKey) continue;

        if (
          formatDateInTimezone(notification.createdAt, timezone) !== todayKey
        ) {
          continue;
        }

        const existing = existingTitlesByUser.get(notification.userId);
        if (existing) {
          existing.add(notification.title);
        } else {
          existingTitlesByUser.set(
            notification.userId,
            new Set([notification.title]),
          );
        }
      }

      const allItemIds = userContexts.flatMap((ctx) =>
        ctx.activeStack.items.map((item) => item.id),
      );
      const uniqueLogDates = Array.from(
        new Set(
          userContexts.map((ctx) => new Date(ctx.todayKey).toISOString()),
        ),
      ).map((iso) => new Date(iso));

      const takenLogs =
        allItemIds.length > 0
          ? await this.db.stackLog.findMany({
              where: {
                stackItemId: { in: allItemIds },
                date: { in: uniqueLogDates },
                taken: true,
              },
              select: {
                stackItemId: true,
                date: true,
              },
            })
          : [];

      const takenLogCountByItemDate = new Map<string, number>();
      for (const log of takenLogs) {
        const key = `${log.stackItemId}:${log.date.toISOString().slice(0, 10)}`;
        takenLogCountByItemDate.set(
          key,
          (takenLogCountByItemDate.get(key) ?? 0) + 1,
        );
      }

      for (const ctx of userContexts) {
        const { user, todayKey, dueSlots, activeStack } = ctx;
        const existingTitles =
          existingTitlesByUser.get(user.id) ?? new Set<string>();
        const todayToken = todayKey;

        for (const slot of dueSlots) {
          const slotItems = activeStack.items.filter(
            (item) => item.timeSlot === slot,
          );
          if (slotItems.length === 0) continue;

          const title = `Stack reminder: ${this.slotLabel(slot)} items`;
          if (existingTitles.has(title)) continue;

          const itemIds = slotItems.map((item) => item.id);
          const takenCount = itemIds.reduce((sum, itemId) => {
            const key = `${itemId}:${todayToken}`;
            return sum + (takenLogCountByItemDate.get(key) ?? 0);
          }, 0);

          if (takenCount >= slotItems.length) continue;

          const remaining = slotItems.length - takenCount;
          const idempotencyKey = `adherence:stack:${user.id}:${todayKey}:${slot}`;

          const inserted = await this.db.notification.createMany({
            data: [
              {
                userId: user.id,
                type: "STACK_REMINDER",
                title,
                body:
                  remaining === 1
                    ? `You still have 1 ${this.slotLabel(slot).toLowerCase()} supplement to log in ${activeStack.name}.`
                    : `You still have ${remaining} ${this.slotLabel(slot).toLowerCase()} supplements to log in ${activeStack.name}.`,
                actionUrl: "/stack",
                idempotencyKey,
                data: {
                  source: "worker:adherence-reminders",
                  category: "STACK",
                  slot,
                  date: todayKey,
                  remaining,
                  stackId: activeStack.id,
                },
              },
            ],
            skipDuplicates: true,
          });

          if (inserted.count > 0) {
            sentCount += 1;
          }
        }
      }

      cursor = users[users.length - 1]?.id;
    }

    if (sentCount > 0) {
      this.logger.log(`Sent ${sentCount} stack adherence reminders`);
    }
  }

  private async sendDailyInjectionReminders(): Promise<void> {
    const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    let sentCount = 0;

    let cursor: string | undefined;
    while (true) {
      const users = await this.db.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { injectionProtocols: { some: {} } },
            { injectionLogs: { some: {} } },
          ],
        },
        select: {
          id: true,
          profile: {
            select: {
              timezone: true,
            },
          },
        },
        orderBy: { id: "asc" },
        take: USER_BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
      });

      if (users.length === 0) {
        break;
      }

      const userIds = users.map((user) => user.id);
      const recentLogs = await this.db.injectionLog.findMany({
        where: {
          userId: { in: userIds },
          loggedAt: { gte: cutoff },
        },
        select: {
          userId: true,
          loggedAt: true,
        },
      });

      const logsByUser = new Map<string, Date[]>();
      for (const log of recentLogs) {
        const existing = logsByUser.get(log.userId);
        if (existing) {
          existing.push(log.loggedAt);
        } else {
          logsByUser.set(log.userId, [log.loggedAt]);
        }
      }

      for (const user of users) {
        const timezone = user.profile?.timezone || "UTC";
        const todayKey = getTodayInTimezone(timezone);
        const localHour = this.getHourInTimezone(timezone);

        if (localHour < 20) continue;

        const reminderTitle = "Daily injection check-in";

        const hasLogToday = (logsByUser.get(user.id) ?? []).some(
          (loggedAt) => formatDateInTimezone(loggedAt, timezone) === todayKey,
        );

        if (hasLogToday) continue;
        const idempotencyKey = `adherence:injection:${user.id}:${todayKey}`;

        const inserted = await this.db.notification.createMany({
          data: [
            {
              userId: user.id,
              type: "INJECTION_REMINDER",
              title: reminderTitle,
              body: "No injection was logged today yet. Open Injection Tracker to check in.",
              actionUrl: "/injections",
              idempotencyKey,
              data: {
                source: "worker:adherence-reminders",
                category: "INJECTION",
                date: todayKey,
              },
            },
          ],
          skipDuplicates: true,
        });

        if (inserted.count > 0) {
          sentCount += 1;
        }
      }

      cursor = users[users.length - 1]?.id;
    }

    if (sentCount > 0) {
      this.logger.log(`Sent ${sentCount} daily injection reminders`);
    }
  }

  private async sendDailyClimbSelfieReminders(): Promise<void> {
    let sentCount = 0;

    let cursor: string | undefined;
    while (true) {
      const users = await this.db.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          profile: {
            select: {
              timezone: true,
            },
          },
        },
        orderBy: { id: "asc" },
        take: USER_BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
      });

      if (users.length === 0) {
        break;
      }

      const userContexts = users
        .map((user) => {
          const timezone = user.profile?.timezone || "UTC";
          const todayKey = getTodayInTimezone(timezone);
          const localHour = this.getHourInTimezone(timezone);

          if (localHour < CLIMB_REMINDER_START_HOUR) {
            return null;
          }

          return {
            user,
            todayKey,
            capturedDate: createUtcDateKey(todayKey),
          };
        })
        .filter((ctx) => ctx !== null);

      if (userContexts.length === 0) {
        cursor = users[users.length - 1]?.id;
        continue;
      }

      const userIds = userContexts.map((ctx) => ctx.user.id);
      const uniqueCapturedDates = Array.from(
        new Set(userContexts.map((ctx) => ctx.capturedDate.toISOString())),
      ).map((iso) => new Date(iso));

      const climbEntries = await this.db.climbEntry.findMany({
        where: {
          userId: { in: userIds },
          category: "DAILY",
          capturedDate: { in: uniqueCapturedDates },
        },
        select: {
          userId: true,
          capturedDate: true,
        },
      });

      const hasEntryByUserDate = new Set(
        climbEntries.map(
          (entry) =>
            `${entry.userId}:${entry.capturedDate.toISOString().slice(0, 10)}`,
        ),
      );

      for (const ctx of userContexts) {
        const { user, todayKey, capturedDate } = ctx;

        const reminderTitle = "Daily Climb selfie reminder";

        const climbKey = `${user.id}:${capturedDate.toISOString().slice(0, 10)}`;
        const hasDailyClimbEntry = hasEntryByUserDate.has(climbKey);

        if (hasDailyClimbEntry) continue;

        const idempotencyKey = `adherence:climb:${user.id}:${todayKey}`;

        const inserted = await this.db.notification.createMany({
          data: [
            {
              userId: user.id,
              type: "CLIMB_REMINDER",
              title: reminderTitle,
              body: "You haven't logged today's Climb selfie yet. Snap one tonight to keep your progress streak alive.",
              actionUrl: "/climb",
              idempotencyKey,
              data: {
                source: "worker:adherence-reminders",
                category: "CLIMB",
                date: todayKey,
              },
            },
          ],
          skipDuplicates: true,
        });

        if (inserted.count > 0) {
          sentCount += 1;
        }
      }

      cursor = users[users.length - 1]?.id;
    }

    if (sentCount > 0) {
      this.logger.log(`Sent ${sentCount} daily climb selfie reminders`);
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

  private getDueSlots(hour: number): Slot[] {
    const slots: Slot[] = [];

    if (hour >= SLOT_START_HOURS.MORNING) slots.push("MORNING");
    if (hour >= SLOT_START_HOURS.AFTERNOON) slots.push("AFTERNOON");
    if (hour >= SLOT_START_HOURS.EVENING) slots.push("EVENING");

    return slots;
  }

  private slotLabel(slot: Slot): string {
    if (slot === "MORNING") return "Morning";
    if (slot === "AFTERNOON") return "Afternoon";
    return "Evening";
  }
}

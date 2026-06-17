import { useEffect, useRef } from 'react';
import { isNativeApp } from '@/lib/capacitor';
import {
  scheduleNotifications,
  cancelAllNotifications,
  requestNotificationPermission,
  type ScheduleNotificationOptions,
} from '@/lib/local-notifications';
import type { TimeSlot } from '@varaperformance/core';

// Stable ID ranges per reminder type to avoid collisions
const ID_OFFSET = {
  SUPPLEMENT: 10_000,
  WATER: 20_000,
  HABIT: 30_000,
  COACHING: 40_000,
} as const;

const TIME_SLOT_HOURS: Record<TimeSlot, number> = {
  MORNING: 8,
  AFTERNOON: 13,
  EVENING: 20,
};

interface SupplementReminder {
  id: string;
  name: string;
  dosage: string;
  timeSlot: TimeSlot | null;
}

interface HabitReminder {
  id: string;
  name: string;
  /** Hour of day (0-23) to fire */
  reminderHour: number;
}

interface CoachingSessionReminder {
  id: string;
  title: string;
  /** ISO date-time of the session start */
  startsAt: string;
}

interface ReminderConfig {
  supplements?: SupplementReminder[];
  waterGoalMl?: number;
  habits?: HabitReminder[];
  coachingSessions?: CoachingSessionReminder[];
}

function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 10_000;
}

function buildNotifications(
  config: ReminderConfig,
): ScheduleNotificationOptions[] {
  const now = Date.now();
  const notifications: ScheduleNotificationOptions[] = [];

  // Supplement reminders — one per item per time slot, daily for 7 days
  if (config.supplements) {
    for (const supp of config.supplements) {
      if (!supp.timeSlot) continue;
      const hour = TIME_SLOT_HOURS[supp.timeSlot];
      const baseId = ID_OFFSET.SUPPLEMENT + hashStringToInt(supp.id);
      for (let day = 0; day < 7; day++) {
        const scheduleAt = new Date();
        scheduleAt.setDate(scheduleAt.getDate() + day);
        scheduleAt.setHours(hour, 0, 0, 0);
        if (scheduleAt.getTime() <= now) continue;
        notifications.push({
          id: baseId + day,
          title: `Take ${supp.name}`,
          body: `${supp.dosage} — ${supp.timeSlot.toLowerCase()} dose`,
          scheduleAt,
          extra: { type: 'supplement', itemId: supp.id },
        });
      }
    }
  }

  // Water intake nudges — 3x daily for 7 days
  if (config.waterGoalMl && config.waterGoalMl > 0) {
    const waterHours = [10, 14, 17];
    for (let day = 0; day < 7; day++) {
      for (let i = 0; i < waterHours.length; i++) {
        const scheduleAt = new Date();
        scheduleAt.setDate(scheduleAt.getDate() + day);
        scheduleAt.setHours(waterHours[i], 0, 0, 0);
        if (scheduleAt.getTime() <= now) continue;
        notifications.push({
          id: ID_OFFSET.WATER + day * 10 + i,
          title: 'Drink Water',
          body: `Stay on track — your daily goal is ${config.waterGoalMl}ml`,
          scheduleAt,
          extra: { type: 'water' },
        });
      }
    }
  }

  // Habit reminders — daily for 7 days
  if (config.habits) {
    for (const habit of config.habits) {
      const baseId = ID_OFFSET.HABIT + hashStringToInt(habit.id);
      for (let day = 0; day < 7; day++) {
        const scheduleAt = new Date();
        scheduleAt.setDate(scheduleAt.getDate() + day);
        scheduleAt.setHours(habit.reminderHour, 0, 0, 0);
        if (scheduleAt.getTime() <= now) continue;
        notifications.push({
          id: baseId + day,
          title: habit.name,
          body: 'Time for your daily check-in',
          scheduleAt,
          extra: { type: 'habit', habitId: habit.id },
        });
      }
    }
  }

  // Coaching session reminders — 15 min and 1 hour before
  if (config.coachingSessions) {
    for (const session of config.coachingSessions) {
      const startTime = new Date(session.startsAt).getTime();
      const baseId = ID_OFFSET.COACHING + hashStringToInt(session.id);

      const oneHourBefore = new Date(startTime - 60 * 60 * 1000);
      if (oneHourBefore.getTime() > now) {
        notifications.push({
          id: baseId,
          title: session.title,
          body: 'Starts in 1 hour',
          scheduleAt: oneHourBefore,
          extra: { type: 'coaching', sessionId: session.id },
        });
      }

      const fifteenMinBefore = new Date(startTime - 15 * 60 * 1000);
      if (fifteenMinBefore.getTime() > now) {
        notifications.push({
          id: baseId + 1,
          title: session.title,
          body: 'Starts in 15 minutes',
          scheduleAt: fifteenMinBefore,
          extra: { type: 'coaching', sessionId: session.id },
        });
      }
    }
  }

  return notifications;
}

export function useLocalReminders(config: ReminderConfig): void {
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    if (!isNativeApp()) return;

    let cancelled = false;

    const sync = async () => {
      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;

      await cancelAllNotifications();
      const notifications = buildNotifications(configRef.current);
      if (notifications.length > 0) {
        await scheduleNotifications(notifications);
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [
    config.supplements,
    config.waterGoalMl,
    config.habits,
    config.coachingSessions,
  ]);
}

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from '@/lib/capacitor';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const result = await LocalNotifications.checkPermissions();
  return result.display === 'granted';
}

export interface ScheduleNotificationOptions {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  extra?: Record<string, string>;
}

export async function scheduleNotification(
  options: ScheduleNotificationOptions,
): Promise<void> {
  if (!isNativeApp()) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: { at: options.scheduleAt },
        extra: options.extra,
      },
    ],
  });
}

export async function scheduleNotifications(
  notifications: ScheduleNotificationOptions[],
): Promise<void> {
  if (!isNativeApp() || notifications.length === 0) return;
  await LocalNotifications.schedule({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: { at: n.scheduleAt },
      extra: n.extra,
    })),
  });
}

export async function cancelNotification(id: number): Promise<void> {
  if (!isNativeApp()) return;
  await LocalNotifications.cancel({ notifications: [{ id }] });
}

export async function cancelNotifications(ids: number[]): Promise<void> {
  if (!isNativeApp() || ids.length === 0) return;
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });
}

export async function cancelAllNotifications(): Promise<void> {
  if (!isNativeApp()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}

export async function getPendingNotifications(): Promise<number[]> {
  if (!isNativeApp()) return [];
  const pending = await LocalNotifications.getPending();
  return pending.notifications.map((n) => n.id);
}

export function onNotificationAction(
  cb: (actionId: string, extra?: Record<string, string>) => void,
): Promise<() => void> {
  if (!isNativeApp()) return Promise.resolve(() => {});
  return LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (event) => {
      cb(event.actionId, event.notification.extra);
    },
  ).then((handle) => () => {
    void handle.remove();
  });
}

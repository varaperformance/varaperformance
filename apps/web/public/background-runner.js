/**
 * Capacitor BackgroundRunner task script.
 *
 * Runs in a lightweight native JS context — no DOM, no Capacitor plugins.
 * Available globals: fetch, crypto, console, setTimeout, CapacitorKV,
 * CapacitorNotifications.
 *
 * This task runs every 15 minutes. It:
 *   1. Pings the health-sync status endpoint (keeps lastSeenAt fresh).
 *   2. Fetches unread notifications and surfaces them as local notifications
 *      so the user sees them even when the app is backgrounded.
 */

const API_BASE = 'https://api.varaperformance.com/v1';

// Keys shared with the main app via @capacitor/preferences / CapacitorKV
const KV_ACCESS_TOKEN = 'vara.auth.bgAccessToken';
const KV_LAST_NOTIFICATION_AT = 'vara.notifications.lastSeenAt';

// Notification IDs are stable integers derived from the notification
// creation timestamp so reruns don't reschedule the same notification.
function notifIdFromTimestamp(isoString) {
  const ms = new Date(isoString).getTime();
  // Clamp to positive 32-bit int range that iOS/Android accept.
  return Math.abs(ms % 2_147_483_647) || 1;
}

// Map Vara notification types to human-readable categories for the
// notification subtitle — keeps the copy generic (no extra strings needed).
function categoryLabel(type) {
  if (type.startsWith('BOOKING')) return 'Coaching';
  if (type.startsWith('MESSAGE')) return 'Message';
  if (type.startsWith('PAYMENT') || type.startsWith('SUBSCRIPTION'))
    return 'Billing';
  if (type.startsWith('ORDER')) return 'Order';
  if (type.startsWith('GYM_PARTNER')) return 'Gym Partner';
  if (type.startsWith('ACHIEVEMENT')) return 'Achievement';
  if (type.startsWith('POST') || type === 'REVIEW_RECEIVED') return 'Social';
  return 'Vara Performance';
}

addEventListener('healthSync', async () => {
  // ── 1. Health-sync heartbeat ──────────────────────────────────────────────
  try {
    await fetch(`${API_BASE}/health-data/sync/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Silent — next run retries
  }

  // ── 2. Notification polling ───────────────────────────────────────────────
  try {
    const tokenResult = CapacitorKV.get(KV_ACCESS_TOKEN);
    const token = tokenResult?.value;
    if (!token) return; // Not signed in — nothing to do

    const lastSeenResult = CapacitorKV.get(KV_LAST_NOTIFICATION_AT);
    const lastSeenAt = lastSeenResult?.value ?? null;

    const url = new URL(`${API_BASE}/notifications`);
    url.searchParams.set('unreadOnly', 'true');
    url.searchParams.set('limit', '10');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return;

    const json = await res.json();
    const notifications = json?.data?.notifications ?? [];

    // Only show notifications that arrived after the last time we checked.
    const newNotifications = lastSeenAt
      ? notifications.filter((n) => new Date(n.createdAt) > new Date(lastSeenAt))
      : notifications;

    if (newNotifications.length === 0) return;

    // Schedule a local notification for each new item.
    CapacitorNotifications.schedule(
      newNotifications.map((n) => ({
        id: notifIdFromTimestamp(n.createdAt),
        title: n.title,
        body: n.body,
        // Extra data is surfaced on tap via localNotificationActionPerformed.
        extra: {
          notificationId: n.id,
          type: n.type,
          actionUrl: n.actionUrl ?? '',
        },
      })),
    );

    // Persist the most recent createdAt so we don't re-show on next run.
    const newest = newNotifications.reduce((a, b) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
    );
    CapacitorKV.set(KV_LAST_NOTIFICATION_AT, newest.createdAt);
  } catch {
    // Silent — network error or malformed response; next run retries
  }
});

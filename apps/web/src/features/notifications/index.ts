export {
  type NotificationResponse,
  notificationKeys,
  useNotifications,
  useUnreadCount,
  useMarkNotificationsRead,
  useMarkAllRead,
  useNotificationSocket,
} from './hooks/use-notifications';

export {
  notificationPreferencesKeys,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './hooks/use-notification-preferences';

export {
  emailPreferencesKeys,
  useEmailPreferences,
  useUpdateEmailPreferences,
} from './hooks/use-email-preferences';

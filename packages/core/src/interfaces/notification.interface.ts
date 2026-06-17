import type { NotificationResponse } from '../schemas/notification.schema';

/**
 * Socket.IO events for notifications - Server to Client
 */
export interface NotificationServerToClientEvents {
  // New notification received
  'notification:new': (notification: NotificationResponse) => void;
  // Notification marked as read
  'notification:read': (data: { notificationId: string }) => void;
  // All notifications marked as read
  'notification:read:all': () => void;
  // Unread count updated
  'notification:count': (data: { count: number }) => void;
  // Error event
  error: (data: { message: string; code?: string }) => void;
}

/**
 * Socket.IO events for notifications - Client to Server
 */
export interface NotificationClientToServerEvents {
  // Mark notification as read
  'notification:read': (data: { notificationId: string }) => void;
  // Mark all notifications as read
  'notification:read:all': () => void;
  // Request unread count
  'notification:count': () => void;
}

/**
 * RabbitMQ message for creating a notification
 */
export interface NotificationMessage {
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  timestamp: string;
  idempotencyKey?: string;
}

/**
 * Notification with UI helpers
 */
export interface NotificationWithMeta extends NotificationResponse {
  isNew?: boolean; // For animation purposes
}

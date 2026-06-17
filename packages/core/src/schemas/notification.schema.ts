import { z } from 'zod';

// ============================================
// Notification Type Enum
// ============================================

export const NotificationTypeSchema = z.enum([
  // Coaching
  'BOOKING_REQUESTED',
  'BOOKING_APPROVED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',

  // Messaging
  'MESSAGE_RECEIVED',

  // Payment
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'SUBSCRIPTION_RENEWED',
  'SUBSCRIPTION_CANCELLED',

  // Gym Partners
  'GYM_PARTNER_REQUEST',
  'GYM_PARTNER_ACCEPTED',

  // Workout Plans
  'WORKOUT_PLAN_ASSIGNED',

  // Commerce
  'ORDER_CONFIRMED',
  'ORDER_SHIPPED',
  'ORDER_REFUNDED',

  // Elevate Social
  'POST_COMMENT_RECEIVED',
  'POST_HIGH_FIVED',

  // Team / Ambassador
  'AMBASSADOR_APPLICATION_APPROVED',
  'AMBASSADOR_APPLICATION_DENIED',

  // Health Adherence
  'STACK_REMINDER',
  'INJECTION_REMINDER',
  'CLIMB_REMINDER',

  // Achievements
  'ACHIEVEMENT_UNLOCKED',

  // Calendar
  'SESSION_REMINDER',

  // System
  'SYSTEM_ANNOUNCEMENT',
  'PROFILE_VERIFIED',
  'REVIEW_RECEIVED',
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// ============================================
// Notification Response Schema
// ============================================

export const NotificationResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  actionUrl: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).nullable(),
  read: z.boolean(),
  readAt: z.date().nullable(),
  createdAt: z.date(),
});

export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;

// ============================================
// Notification List Data
// ============================================

export const NotificationListDataSchema = z.object({
  notifications: z.array(NotificationResponseSchema),
  unreadCount: z.number().int().min(0),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

export type NotificationListData = z.infer<typeof NotificationListDataSchema>;

// ============================================
// Unread Count Schema
// ============================================

export const UnreadCountDataSchema = z.object({
  count: z.number().int().min(0),
});

export type UnreadCountData = z.infer<typeof UnreadCountDataSchema>;

// ============================================
// Mark Read Schema
// ============================================

export const MarkNotificationsReadSchema = z.object({
  notificationIds: z.array(z.uuid()).min(1).max(100),
});

export type MarkNotificationsRead = z.infer<typeof MarkNotificationsReadSchema>;

export const MarkAllReadSchema = z.object({
  beforeDate: z.iso.datetime().optional(),
});

export type MarkAllRead = z.infer<typeof MarkAllReadSchema>;

// ============================================
// Query Parameters
// ============================================

export const NotificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.uuid().optional(),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;

// ============================================
// Create Notification (internal use)
// ============================================

export const CreateNotificationSchema = z.object({
  userId: z.uuid(),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  actionUrl: z.url().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type CreateNotification = z.infer<typeof CreateNotificationSchema>;

// ============================================
// RabbitMQ Message Schema (notification.create queue)
// ============================================

export const NotificationMessageSchema = z.object({
  userId: z.uuid(),
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  actionUrl: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
  idempotencyKey: z.string().optional(),
});

export type NotificationMessagePayload = z.infer<
  typeof NotificationMessageSchema
>;

// ============================================
// Notification Preferences
// ============================================

export const NotificationPreferencesSchema = z.object({
  // Category toggles
  bookings: z.boolean(),
  messages: z.boolean(),
  payments: z.boolean(),
  subscriptions: z.boolean(),
  gymPartners: z.boolean(),
  workoutPlans: z.boolean(),
  reviews: z.boolean(),
  commerce: z.boolean(),
  social: z.boolean(),
  sessionReminders: z.boolean(),
  stackManagement: z.boolean(),
  injectionTracker: z.boolean(),
  climb: z.boolean(),
  achievements: z.boolean(),
  ambassador: z.boolean(),
  systemAnnouncements: z.boolean(),

  // Channel controls
  inApp: z.boolean(),
  digest: z.boolean(),

  // Quiet hours
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.number().int().min(0).max(23),
  quietHoursEnd: z.number().int().min(0).max(23),
});

export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;

export const UpdateNotificationPreferencesSchema =
  NotificationPreferencesSchema.partial();

export type UpdateNotificationPreferences = z.infer<
  typeof UpdateNotificationPreferencesSchema
>;

/**
 * Maps each NotificationType to its preference category key.
 */
export const NOTIFICATION_TYPE_TO_CATEGORY: Record<
  string,
  keyof NotificationPreferences
> = {
  BOOKING_REQUESTED: 'bookings',
  BOOKING_APPROVED: 'bookings',
  BOOKING_CONFIRMED: 'bookings',
  BOOKING_CANCELLED: 'bookings',
  MESSAGE_RECEIVED: 'messages',
  PAYMENT_RECEIVED: 'payments',
  PAYMENT_FAILED: 'payments',
  SUBSCRIPTION_RENEWED: 'subscriptions',
  SUBSCRIPTION_CANCELLED: 'subscriptions',
  GYM_PARTNER_REQUEST: 'gymPartners',
  GYM_PARTNER_ACCEPTED: 'gymPartners',
  WORKOUT_PLAN_ASSIGNED: 'workoutPlans',
  ORDER_CONFIRMED: 'commerce',
  ORDER_SHIPPED: 'commerce',
  ORDER_REFUNDED: 'commerce',
  POST_COMMENT_RECEIVED: 'social',
  POST_HIGH_FIVED: 'social',
  STACK_REMINDER: 'stackManagement',
  INJECTION_REMINDER: 'injectionTracker',
  CLIMB_REMINDER: 'climb',
  SESSION_REMINDER: 'sessionReminders',
  AMBASSADOR_APPLICATION_APPROVED: 'ambassador',
  AMBASSADOR_APPLICATION_DENIED: 'ambassador',
  ACHIEVEMENT_UNLOCKED: 'achievements',
  REVIEW_RECEIVED: 'reviews',
  SYSTEM_ANNOUNCEMENT: 'systemAnnouncements',
  PROFILE_VERIFIED: 'systemAnnouncements',
};

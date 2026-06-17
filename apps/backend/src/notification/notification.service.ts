import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import type {
  NotificationResponse,
  NotificationListData,
  UnreadCountData,
  NotificationPreferences,
  UpdateNotificationPreferences,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';
import { NOTIFICATION_TYPE_TO_CATEGORY } from '@varaperformance/core';
import { NotificationGateway } from './notification.gateway';
import {
  hasValidQuietHoursWindow,
  isWithinQuietHoursWindow,
} from './notification-quiet-hours';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly quietHoursStart = Number(
    process.env.NOTIFICATION_QUIET_HOURS_START ?? '22',
  );
  private readonly quietHoursEnd = Number(
    process.env.NOTIFICATION_QUIET_HOURS_END ?? '7',
  );

  constructor(
    private readonly prisma: DatabaseService,
    private readonly encryption: EncryptionService,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly gateway: NotificationGateway,
  ) {}

  /**
   * Get notifications for a user with cursor-based pagination
   */
  async getNotifications(
    userId: string,
    limit = 20,
    cursor?: string,
    unreadOnly = false,
  ): Promise<SuccessResponse<NotificationListData> | ErrorResponse> {
    const whereClause = {
      userId,
      ...(unreadOnly && { read: false }),
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    };

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          body: true,
          actionUrl: true,
          data: true,
          read: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;

    return {
      success: true,
      data: {
        notifications: items as NotificationResponse[],
        unreadCount,
        hasMore,
        nextCursor: hasMore
          ? items[items.length - 1]?.createdAt.toISOString()
          : undefined,
      },
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(
    userId: string,
  ): Promise<SuccessResponse<UnreadCountData> | ErrorResponse> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { success: true, data: { count } };
  }

  /**
   * Mark specific notifications as read
   */
  async markAsRead(
    userId: string,
    notificationIds: string[],
  ): Promise<SuccessResponse<{ marked: number }> | ErrorResponse> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId, // Ensure user owns these notifications
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true, data: { marked: result.count } };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(
    userId: string,
  ): Promise<SuccessResponse<{ marked: number }> | ErrorResponse> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true, data: { marked: result.count } };
  }

  /**
   * Delete old read notifications (for cleanup job)
   */
  async deleteOldNotifications(
    userId: string,
    olderThan: Date,
  ): Promise<SuccessResponse<{ deleted: number }> | ErrorResponse> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        read: true,
        createdAt: { lt: olderThan },
      },
    });

    return { success: true, data: { deleted: result.count } };
  }

  /**
   * Create a notification directly and push via WebSocket.
   * Respects user notification preferences — if the user has disabled
   * the category this notification type belongs to, it is silently skipped.
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    actionUrl?: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationResponse | null> {
    // Check user preferences before creating
    const suppressed = await this.isSuppressedByPreference(
      data.userId,
      data.type,
    );
    if (suppressed) {
      this.logger.debug(
        `Notification type ${data.type} suppressed by user preference for ${data.userId}`,
      );
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl,
        data: data.data as any,
        ...this.encryptNotification(data.body, data.data),
      },
    });

    const response = notification as NotificationResponse;

    const suppressRealtime = await this.shouldSuppressRealtimeDelivery(
      data.userId,
    );

    if (suppressRealtime) {
      this.logger.debug(
        `Suppressing realtime push for notification ${response.id} (quiet hours)`,
      );
      return response;
    }

    // Push notification via WebSocket for real-time delivery
    try {
      this.gateway.sendToUser(data.userId, response);
      this.logger.debug(
        `Pushed notification ${response.id} to user ${data.userId}`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to push notification via WebSocket: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    return response;
  }

  // ============================================
  // Notification Preferences
  // ============================================

  /**
   * Get or create default notification preferences for a user
   */
  async getPreferences(
    userId: string,
  ): Promise<SuccessResponse<NotificationPreferences> | ErrorResponse> {
    const prefs = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return {
      success: true,
      data: {
        bookings: prefs.bookings,
        messages: prefs.messages,
        payments: prefs.payments,
        subscriptions: prefs.subscriptions,
        gymPartners: prefs.gymPartners,
        workoutPlans: prefs.workoutPlans,
        reviews: prefs.reviews,
        commerce: prefs.commerce,
        social: prefs.social,
        sessionReminders: prefs.sessionReminders,
        stackManagement: prefs.stackManagement,
        injectionTracker: prefs.injectionTracker,
        climb: prefs.climb,
        ambassador: prefs.ambassador,
        systemAnnouncements: prefs.systemAnnouncements,
        achievements: prefs.achievements,
        inApp: prefs.inApp,
        digest: prefs.digest,
        quietHoursEnabled: prefs.quietHoursEnabled,
        quietHoursStart: prefs.quietHoursStart,
        quietHoursEnd: prefs.quietHoursEnd,
      },
    };
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    update: UpdateNotificationPreferences,
  ): Promise<SuccessResponse<NotificationPreferences> | ErrorResponse> {
    const prefs = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...update },
      update,
    });

    return {
      success: true,
      data: {
        bookings: prefs.bookings,
        messages: prefs.messages,
        payments: prefs.payments,
        subscriptions: prefs.subscriptions,
        gymPartners: prefs.gymPartners,
        workoutPlans: prefs.workoutPlans,
        reviews: prefs.reviews,
        commerce: prefs.commerce,
        social: prefs.social,
        sessionReminders: prefs.sessionReminders,
        stackManagement: prefs.stackManagement,
        injectionTracker: prefs.injectionTracker,
        climb: prefs.climb,
        ambassador: prefs.ambassador,
        systemAnnouncements: prefs.systemAnnouncements,
        achievements: prefs.achievements,
        inApp: prefs.inApp,
        digest: prefs.digest,
        quietHoursEnabled: prefs.quietHoursEnabled,
        quietHoursStart: prefs.quietHoursStart,
        quietHoursEnd: prefs.quietHoursEnd,
      },
    };
  }

  /**
   * Check if a notification type is suppressed by user preferences
   */
  private async isSuppressedByPreference(
    userId: string,
    type: string,
  ): Promise<boolean> {
    const categoryKey = NOTIFICATION_TYPE_TO_CATEGORY[type];
    if (!categoryKey) return false; // Unknown type — allow through

    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // No preferences row means all defaults (all enabled)
    if (!prefs) return false;

    // Check if in-app channel is globally disabled
    if (!prefs.inApp) return true;

    // Check category toggle
    return prefs[categoryKey] === false;
  }

  private async shouldSuppressRealtimeDelivery(
    userId: string,
  ): Promise<boolean> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const timezone = profile?.timezone ?? 'UTC';
    const localHour = this.getHourInTimezone(timezone);

    // Check per-user quiet hours first
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (prefs?.quietHoursEnabled) {
      if (
        hasValidQuietHoursWindow(prefs.quietHoursStart, prefs.quietHoursEnd) &&
        isWithinQuietHoursWindow(
          localHour,
          prefs.quietHoursStart,
          prefs.quietHoursEnd,
        )
      ) {
        return true;
      }
    }

    // Fall back to global quiet hours
    if (!hasValidQuietHoursWindow(this.quietHoursStart, this.quietHoursEnd)) {
      return false;
    }

    return isWithinQuietHoursWindow(
      localHour,
      this.quietHoursStart,
      this.quietHoursEnd,
    );
  }

  private getHourInTimezone(timezone: string): number {
    const value = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).format(new Date());

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Push an existing notification row to active websocket clients.
   */
  async pushExistingNotification(notificationId: string): Promise<boolean> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found for push`);
      return false;
    }

    this.gateway.sendToUser(
      notification.userId,
      notification as NotificationResponse,
    );
    this.logger.debug(
      `Pushed existing notification ${notification.id} to user ${notification.userId}`,
    );
    return true;
  }

  private encryptNotification(body: string, data?: Record<string, unknown>) {
    const payload = JSON.stringify({ body, data });
    const enc = this.encryption.encrypt(payload);
    return {
      eNotification: enc.encryptedContent,
      notificationIv: enc.contentIv,
      notificationAuthTag: enc.contentAuthTag,
      notificationWrappedKey: enc.wrappedKey,
    };
  }
}

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
  getNotificationSocket,
} from '@/lib/notification-socket';
import type {
  SuccessResponse,
  NotificationResponse,
  NotificationListData,
  UnreadCountData,
} from '@varaperformance/core';

// Re-export types for convenience
export type { NotificationResponse };

// ============================================
// API Functions
// ============================================

const getNotifications = async (params?: {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');

  const query = searchParams.toString();
  const response = await api.get<SuccessResponse<NotificationListData>>(
    `notifications${query ? `?${query}` : ''}`,
  );
  return response.data;
};

const getUnreadCount = async () => {
  const response = await api.get<SuccessResponse<UnreadCountData>>(
    'notifications/unread-count',
  );
  return response.data;
};

const markNotificationsRead = async (notificationIds: string[]) => {
  const response = await api.post<SuccessResponse<{ marked: number }>>(
    'notifications/mark-read',
    { notificationIds },
  );
  return response.data;
};

const markAllNotificationsRead = async () => {
  const response = await api.post<SuccessResponse<{ marked: number }>>(
    'notifications/mark-all-read',
  );
  return response.data;
};

// ============================================
// Query Keys
// ============================================

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: { limit?: number; cursor?: string; unreadOnly?: boolean }) =>
    [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * Get paginated notifications
 */
export function useNotifications(params?: {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
  socketConnected?: boolean;
}) {
  const { socketConnected, ...queryParams } = params ?? {};
  return useQuery({
    queryKey: notificationKeys.list(queryParams),
    queryFn: () => getNotifications(queryParams),
    staleTime: 30_000,
    refetchInterval: socketConnected ? false : 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: !socketConnected,
  });
}

/**
 * Get unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    staleTime: 10_000, // 10 seconds
    refetchInterval: 60_000, // Refetch every minute as fallback
  });
}

/**
 * Mark notifications as read
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    },
  });
}

/**
 * Real-time notification updates via Socket.IO
 */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    // Get socket first (creates if not exists)
    const socket = getNotificationSocket();

    const handleConnect = () => {
      setIsConnected(true);
      // Request count on connect
      socket.emit('notification:count');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleNewNotification = (notification: NotificationResponse) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 100));
      // Refresh only notification list and unread count caches.
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });

      // Messaging updates may arrive through notifications when the user
      // is not actively joined to a conversation socket room.
      if (notification.type === 'MESSAGE_RECEIVED') {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    const handleCountUpdate = (data: { count: number }) => {
      setUnreadCount(data.count);
    };

    const handleError = (err: { message: string }) => {
      console.error('[NotificationSocket] Error:', err);
    };

    const handleNotificationRead = (data: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === data.notificationId ? { ...n, read: true } : n,
        ),
      );
    };

    const handleAllRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    // Attach listeners BEFORE connecting
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);
    socket.on('notification:new', handleNewNotification);
    socket.on('notification:count', handleCountUpdate);
    socket.on('notification:read', handleNotificationRead);
    socket.on('notification:read:all', handleAllRead);

    connectNotificationSocket();
    if (socket.connected) {
      // Already connected, request count
      socket.emit('notification:count');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:count', handleCountUpdate);
      socket.off('notification:read', handleNotificationRead);
      socket.off('notification:read:all', handleAllRead);
      disconnectNotificationSocket();
    };
  }, [queryClient]);

  const markAsRead = useCallback((notificationId: string) => {
    const socket = getNotificationSocket();
    socket.emit('notification:read', { notificationId });
  }, []);

  const markAllAsRead = useCallback(() => {
    const socket = getNotificationSocket();
    socket.emit('notification:read:all');
  }, []);

  const requestCount = useCallback(() => {
    const socket = getNotificationSocket();
    socket.emit('notification:count');
  }, []);

  return {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    requestCount,
  };
}

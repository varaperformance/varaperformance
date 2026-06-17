import { useState } from 'react';
import { Link } from 'react-router';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationsRead,
  useMarkAllRead,
  useNotificationSocket,
  type NotificationResponse,
} from '@/features/notifications';

// Notification type icons/colors
const notificationConfig: Record<string, { icon: string; color: string }> = {
  BOOKING_REQUESTED: { icon: '📋', color: 'text-blue-500' },
  BOOKING_APPROVED: { icon: '✅', color: 'text-green-500' },
  BOOKING_CONFIRMED: { icon: '🎉', color: 'text-green-600' },
  BOOKING_CANCELLED: { icon: '❌', color: 'text-red-500' },
  MESSAGE_RECEIVED: { icon: '💬', color: 'text-blue-500' },
  PAYMENT_RECEIVED: { icon: '💰', color: 'text-green-500' },
  PAYMENT_FAILED: { icon: '⚠️', color: 'text-red-500' },
  SUBSCRIPTION_RENEWED: { icon: '🔄', color: 'text-blue-500' },
  SUBSCRIPTION_CANCELLED: { icon: '📭', color: 'text-orange-500' },
  SYSTEM_ANNOUNCEMENT: { icon: '📢', color: 'text-purple-500' },
  PROFILE_VERIFIED: { icon: '✨', color: 'text-green-500' },
  REVIEW_RECEIVED: { icon: '⭐', color: 'text-yellow-500' },
};

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

interface NotificationItemProps {
  notification: NotificationResponse;
  onMarkRead: (id: string) => void;
  onSelect?: () => void;
}

function NotificationItem({
  notification,
  onMarkRead,
  onSelect,
}: NotificationItemProps) {
  const config = notificationConfig[notification.type] || {
    icon: '🔔',
    color: 'text-muted-foreground',
  };

  const handleItemClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    onSelect?.();
  };

  const content = (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg transition-colors cursor-pointer',
        notification.read
          ? 'opacity-60 hover:opacity-80'
          : 'bg-primary/5 hover:bg-primary/10',
      )}
      onClick={handleItemClick}
    >
      <span className="text-xl shrink-0">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-tight">
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link
        to={notification.actionUrl}
        className="block"
        onClick={handleItemClick}
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  // REST API queries
  const { data: notificationsData, isLoading } = useNotifications({
    limit: 20,
  });
  const { data: countData } = useUnreadCount();
  const markReadMutation = useMarkNotificationsRead();
  const markAllReadMutation = useMarkAllRead();

  // Socket for real-time updates
  const {
    isConnected,
    unreadCount: socketUnreadCount,
    markAsRead: socketMarkRead,
    markAllAsRead: socketMarkAllRead,
  } = useNotificationSocket();

  // Use socket count if available, otherwise use REST count
  const unreadCount =
    socketUnreadCount !== null
      ? socketUnreadCount
      : countData?.success
        ? countData.data.count
        : 0;

  const notifications = notificationsData?.success
    ? notificationsData.data.notifications
    : [];

  const handleMarkRead = (notificationId: string) => {
    if (isConnected) {
      socketMarkRead(notificationId);
    } else {
      markReadMutation.mutate([notificationId]);
    }
  };

  const handleMarkAllRead = () => {
    if (isConnected) {
      socketMarkAllRead();
    } else {
      markAllReadMutation.mutate();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {!isConnected && (
              <span
                className="w-2 h-2 rounded-full bg-orange-500"
                title="Offline"
              />
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onSelect={() => setIsOpen(false)}
                  />
                  {index < notifications.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <Link to="/notifications">
                  View all notifications
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;

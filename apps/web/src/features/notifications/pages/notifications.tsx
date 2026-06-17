import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import {
  useMarkAllRead,
  useMarkNotificationsRead,
  useNotificationSocket,
  useNotifications,
  useUnreadCount,
  type NotificationResponse,
} from '@/features/notifications';

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

const formatRelativeTime = (date: Date | string): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationResponse;
  onMarkRead: (id: string) => void;
}) {
  const config = notificationConfig[notification.type] || {
    icon: '🔔',
    color: 'text-muted-foreground',
  };

  const handleSelect = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
  };

  const content = (
    <div
      className={cn(
        'flex gap-3 rounded-lg p-4 transition-colors',
        notification.read
          ? 'opacity-70 hover:opacity-85'
          : 'bg-primary/5 hover:bg-primary/10',
      )}
      onClick={handleSelect}
    >
      <span className="text-2xl shrink-0">{config.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-tight">{notification.title}</p>
          {!notification.read ? (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {notification.body}
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </div>
      </div>
    </div>
  );

  if (!notification.actionUrl) {
    return content;
  }

  const isExternal = /^https?:\/\//i.test(notification.actionUrl);
  if (isExternal) {
    return (
      <a
        href={notification.actionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        onClick={handleSelect}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={notification.actionUrl} className="block" onClick={handleSelect}>
      {content}
    </Link>
  );
}

export default function NotificationsPage() {
  const isMobile = useIsMobile();
  const { data: notificationsData, isLoading } = useNotifications({
    limit: 50,
  });
  const { data: countData } = useUnreadCount();
  const markReadMutation = useMarkNotificationsRead();
  const markAllReadMutation = useMarkAllRead();

  const {
    isConnected,
    unreadCount: socketUnreadCount,
    markAsRead: socketMarkRead,
    markAllAsRead: socketMarkAllRead,
  } = useNotificationSocket();

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
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="border-border/70 bg-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {unreadCount} unread
              </span>
            ) : null}
            {unreadCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                  {i < 5 ? <Separator className="mt-3" /> : null}
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification, index) => (
                <SwipeToDelete
                  key={notification.id}
                  onDelete={() => handleMarkRead(notification.id)}
                  disabled={!isMobile}
                >
                  <div className="px-2 py-1">
                    <NotificationRow
                      notification={notification}
                      onMarkRead={handleMarkRead}
                    />
                    {index < notifications.length - 1 ? <Separator /> : null}
                  </div>
                </SwipeToDelete>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm">
          <Link to="/elevate">
            Open Elevate
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

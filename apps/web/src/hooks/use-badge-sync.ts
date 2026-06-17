import { useEffect } from 'react';
import { isNativeApp } from '@/lib/capacitor';
import { setBadgeCount, clearBadge } from '@/lib/badge';
import { useUnreadCount } from '@/features/notifications';
import { useTotalUnread } from '@/features/messaging';

export function useBadgeSync(): void {
  const { data: countData } = useUnreadCount();
  const unreadMessages = useTotalUnread();

  const notificationCount = countData?.success ? countData.data.count : 0;
  const totalBadge = notificationCount + unreadMessages;

  useEffect(() => {
    if (!isNativeApp()) return;

    if (totalBadge > 0) {
      void setBadgeCount(totalBadge);
    } else {
      void clearBadge();
    }
  }, [totalBadge]);
}

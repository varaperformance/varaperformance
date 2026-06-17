import { useRef, useState, useCallback, type ReactNode } from 'react';
import { useQueryClient, type QueryFilters } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticsLight } from '@/lib/haptics';

const THRESHOLD = 80;
const MAX_PULL = 120;
const isNative = Capacitor.isNativePlatform();

interface PullToRefreshProps {
  children: ReactNode;
  /** Optional query filter to scope which queries are invalidated on refresh.
   *  Defaults to all active queries on the current page. */
  queryFilters?: QueryFilters;
}

export default function PullToRefresh({
  children,
  queryFilters,
}: PullToRefreshProps) {
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    },
    [refreshing],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.5, MAX_PULL));
      }
    },
    [refreshing],
  );

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      void hapticsLight();
      await queryClient.invalidateQueries(queryFilters ?? { type: 'active' });
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, queryClient, queryFilters]);

  if (!isNative) {
    return <>{children}</>;
  }

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{
          height: refreshing ? 48 : pullDistance > 10 ? pullDistance : 0,
        }}
      >
        <Loader2
          className={cn('text-muted-foreground', refreshing && 'animate-spin')}
          style={{
            opacity: refreshing ? 1 : progress,
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
          size={24}
        />
      </div>
      {children}
    </div>
  );
}

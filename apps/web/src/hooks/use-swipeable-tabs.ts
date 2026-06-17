import { useRef, useCallback, type RefObject } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';

const SWIPE_THRESHOLD = 50;

interface UseSwipeableTabsOptions {
  currentIndex: number;
  tabCount: number;
  onTabChange: (index: number) => void;
}

interface UseSwipeableTabsReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

/**
 * Hook to enable swiping left/right between tab panels.
 * Only active on mobile. Swipe left → next tab, swipe right → prev tab.
 */
export function useSwipeableTabs({
  currentIndex,
  tabCount,
  onTabChange,
}: UseSwipeableTabsOptions): UseSwipeableTabsReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isMobile = useIsMobile();

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    [isMobile],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;

      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current);

      // Must be horizontal
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < dy) return;

      if (dx < 0 && currentIndex < tabCount - 1) {
        onTabChange(currentIndex + 1);
      } else if (dx > 0 && currentIndex > 0) {
        onTabChange(currentIndex - 1);
      }
    },
    [isMobile, currentIndex, tabCount, onTabChange],
  );

  return {
    containerRef,
    handlers: { onTouchStart, onTouchEnd },
  };
}

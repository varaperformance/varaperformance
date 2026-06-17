import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { isNativeApp } from '@/lib/capacitor';
import { useIsMobile } from '@/hooks/use-is-mobile';

const EDGE_ZONE = 24; // px from left edge
const SWIPE_THRESHOLD = 80; // px to trigger back
const VELOCITY_THRESHOLD = 0.5; // px/ms

/**
 * Enables iOS-style swipe-from-left-edge to go back.
 * Only active on native mobile. Attaches to document to catch edge gestures.
 */
export function useSwipeBack() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    if (!isMobile || !isNativeApp()) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= EDGE_ZONE) {
        startX.current = touch.clientX;
        startY.current = touch.clientY;
        startTime.current = Date.now();
        tracking.current = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);
      const elapsed = Date.now() - startTime.current;
      const velocity = dx / elapsed;

      // Must be a horizontal swipe (dx > dy) past the threshold or fast enough
      if (dx > dy && (dx > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD)) {
        navigate(-1);
      }
    };

    const onTouchCancel = () => {
      tracking.current = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [isMobile, navigate]);
}

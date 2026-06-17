import { useRef, useCallback, useState, type RefObject } from 'react';

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.4;

interface SwipeActionState {
  offsetX: number;
  swiping: boolean;
  revealed: boolean;
}

interface UseSwipeActionReturn {
  ref: RefObject<HTMLDivElement | null>;
  state: SwipeActionState;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  reset: () => void;
}

/**
 * Hook for swipe-to-reveal actions (e.g. swipe-left to delete).
 * Returns touch handlers and an offset to apply via `translateX`.
 */
export function useSwipeAction(
  actionWidth: number = SWIPE_THRESHOLD,
): UseSwipeActionReturn {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const isTracking = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  const [state, setState] = useState<SwipeActionState>({
    offsetX: 0,
    swiping: false,
    revealed: false,
  });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startTime.current = Date.now();
    isTracking.current = true;
    isHorizontal.current = null;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isTracking.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;

      // Determine direction lock on first significant movement
      if (isHorizontal.current === null) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          isHorizontal.current = Math.abs(dx) > Math.abs(dy);
        }
        if (!isHorizontal.current) return;
      }

      if (!isHorizontal.current) return;

      // Only allow swipe-left (negative dx)
      const clampedOffset = Math.min(0, Math.max(-actionWidth * 1.2, dx));

      setState((prev) => ({
        ...prev,
        offsetX: clampedOffset,
        swiping: true,
      }));
    },
    [actionWidth],
  );

  const onTouchEnd = useCallback(() => {
    if (!isTracking.current) return;
    isTracking.current = false;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const velocity = Math.abs(state.offsetX) / elapsed / 1000;
    const pastThreshold =
      Math.abs(state.offsetX) > actionWidth * 0.5 ||
      velocity > VELOCITY_THRESHOLD;

    setState({
      offsetX: pastThreshold ? -actionWidth : 0,
      swiping: false,
      revealed: pastThreshold,
    });
  }, [state.offsetX, actionWidth]);

  const reset = useCallback(() => {
    setState({ offsetX: 0, swiping: false, revealed: false });
  }, []);

  return {
    ref,
    state,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    reset,
  };
}

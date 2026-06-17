import { useState, useEffect, useRef, useCallback } from 'react';
import { hapticsHeavy, hapticsLight, hapticsNotification } from '@/lib/haptics';
import { NotificationType } from '@capacitor/haptics';

export interface RestTimerState {
  isRunning: boolean;
  secondsLeft: number;
  totalSeconds: number;
  progress: number; // 0 → 1 (elapsed / total)
}

export interface UseRestTimerReturn extends RestTimerState {
  start: (seconds: number) => void;
  skip: () => void;
}

const DEFAULT_REST_SECONDS = 90;

export function useRestTimer(
  defaultSeconds = DEFAULT_REST_SECONDS,
): UseRestTimerReturn {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setSecondsLeft(0);
  }, []);

  const start = useCallback(
    (seconds: number) => {
      // Cancel any in-progress timer before starting a new one
      if (intervalRef.current) clearInterval(intervalRef.current);

      const duration = seconds > 0 ? seconds : defaultSeconds;
      setTotalSeconds(duration);
      setSecondsLeft(duration);
      setIsRunning(true);

      void hapticsHeavy();

      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          const next = prev - 1;

          // Haptic feedback in the final 3 seconds
          if (next === 3 || next === 2 || next === 1) {
            void hapticsLight();
          }

          if (next <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsRunning(false);
            void hapticsNotification(NotificationType.Success);
            return 0;
          }

          return next;
        });
      }, 1000);
    },
    [defaultSeconds],
  );

  const skip = useCallback(() => {
    stop();
    void hapticsLight();
  }, [stop]);

  // Clean up on unmount
  useEffect(() => () => stop(), [stop]);

  const progress =
    totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

  return { isRunning, secondsLeft, totalSeconds, progress, start, skip };
}

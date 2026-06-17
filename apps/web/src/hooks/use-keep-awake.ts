import { useEffect, useRef } from 'react';
import { isNativeApp } from '@/lib/capacitor';

/**
 * Keeps the screen awake while `active` is true.
 * Uses the Screen Wake Lock API on the web and native platforms.
 */
export function useKeepAwake(active: boolean): void {
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) {
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
      return;
    }

    const acquireWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLock.current = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock request failed (e.g., low battery)
      }
    };

    // On native platforms and supported browsers
    if (isNativeApp() || 'wakeLock' in navigator) {
      void acquireWakeLock();
    }

    return () => {
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [active]);
}

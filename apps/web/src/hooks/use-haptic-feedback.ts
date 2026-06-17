import { useCallback, type MouseEvent } from 'react';
import { hapticsLight, hapticsSelection } from '@/lib/haptics';
import { isNativeApp } from '@/lib/capacitor';

/**
 * Returns an onClick wrapper that fires a light haptic before the handler.
 * Only triggers on native platforms. No-op on web.
 */
export function useHapticClick<T extends HTMLElement = HTMLElement>(
  handler?: (e: MouseEvent<T>) => void,
) {
  return useCallback(
    (e: MouseEvent<T>) => {
      if (isNativeApp()) void hapticsLight();
      handler?.(e);
    },
    [handler],
  );
}

/**
 * Returns an onChange wrapper that fires a selection haptic (for toggles, switches).
 */
export function useHapticToggle<T = unknown>(handler?: (value: T) => void) {
  return useCallback(
    (value: T) => {
      if (isNativeApp()) void hapticsSelection();
      handler?.(value);
    },
    [handler],
  );
}

import { hapticsLight } from '@/lib/haptics';
import { isNativeApp } from '@/lib/capacitor';

const INTERACTIVE_SELECTORS = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  'input[type="submit"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
].join(',');

/**
 * Registers a global touchstart listener that fires a light haptic
 * when the user taps any interactive element. Call once at app startup.
 * Only activates on native Capacitor platforms.
 */
export function initGlobalHaptics() {
  if (!isNativeApp()) return;

  document.addEventListener(
    'touchstart',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTORS)) {
        void hapticsLight();
      }
    },
    { passive: true },
  );
}

import { useEffect } from 'react';
import {
  lockPortrait,
  lockLandscape,
  unlockOrientation,
} from '@/lib/screen-orientation';

export function useOrientationLock(
  orientation: 'portrait' | 'landscape' | null,
): void {
  useEffect(() => {
    if (!orientation) return;

    if (orientation === 'portrait') {
      void lockPortrait();
    } else {
      void lockLandscape();
    }

    return () => {
      void unlockOrientation();
    };
  }, [orientation]);
}

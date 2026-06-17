import { ScreenOrientation } from '@capacitor/screen-orientation';
import { isNativeApp } from '@/lib/capacitor';

export async function lockPortrait(): Promise<void> {
  if (!isNativeApp()) return;
  await ScreenOrientation.lock({ orientation: 'portrait' });
}

export async function lockLandscape(): Promise<void> {
  if (!isNativeApp()) return;
  await ScreenOrientation.lock({ orientation: 'landscape' });
}

export async function unlockOrientation(): Promise<void> {
  if (!isNativeApp()) return;
  await ScreenOrientation.unlock();
}

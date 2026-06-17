import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativeApp } from '@/lib/capacitor';

export async function hapticsImpact(
  style: ImpactStyle = ImpactStyle.Medium,
): Promise<void> {
  if (!isNativeApp()) return;
  await Haptics.impact({ style });
}

export async function hapticsLight(): Promise<void> {
  return hapticsImpact(ImpactStyle.Light);
}

export async function hapticsMedium(): Promise<void> {
  return hapticsImpact(ImpactStyle.Medium);
}

export async function hapticsHeavy(): Promise<void> {
  return hapticsImpact(ImpactStyle.Heavy);
}

export async function hapticsNotification(
  type: NotificationType = NotificationType.Success,
): Promise<void> {
  if (!isNativeApp()) return;
  await Haptics.notification({ type });
}

export async function hapticsSelection(): Promise<void> {
  if (!isNativeApp()) return;
  await Haptics.selectionStart();
  await Haptics.selectionChanged();
  await Haptics.selectionEnd();
}

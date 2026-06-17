import { Badge } from '@capawesome/capacitor-badge';
import { isNativeApp } from '@/lib/capacitor';

export async function setBadgeCount(count: number): Promise<void> {
  if (!isNativeApp()) return;
  await Badge.set({ count });
}

export async function getBadgeCount(): Promise<number> {
  if (!isNativeApp()) return 0;
  const result = await Badge.get();
  return result.count;
}

export async function clearBadge(): Promise<void> {
  if (!isNativeApp()) return;
  await Badge.clear();
}

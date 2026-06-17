import { Capacitor } from '@capacitor/core';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getCapacitorPlatform(): string {
  return Capacitor.getPlatform();
}

import { Browser } from '@capacitor/browser';
import { isNativeApp } from '@/lib/capacitor';

export async function openUrl(url: string): Promise<void> {
  if (isNativeApp()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function closeBrowser(): Promise<void> {
  if (isNativeApp()) {
    await Browser.close();
  }
}

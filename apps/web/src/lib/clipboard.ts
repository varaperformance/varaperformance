import { Clipboard } from '@capacitor/clipboard';
import { isNativeApp } from '@/lib/capacitor';

export async function writeClipboard(text: string): Promise<void> {
  if (isNativeApp()) {
    await Clipboard.write({ string: text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}

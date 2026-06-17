import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNativeApp } from '@/lib/capacitor';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  imageUrl?: string;
}

async function imageUrlToLocalUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const ext = blob.type.split('/')[1] ?? 'jpg';
    const fileName = `share_${Date.now()}.${ext}`;
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    return result.uri;
  } catch {
    return null;
  }
}

export async function shareContent(options: ShareOptions): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const sharePayload: {
        title?: string;
        text?: string;
        url?: string;
        files?: string[];
      } = {
        title: options.title,
        text: options.text,
        url: options.url,
      };

      if (options.imageUrl) {
        const fileUri = await imageUrlToLocalUri(options.imageUrl);
        if (fileUri) {
          sharePayload.files = [fileUri];
        }
      }

      await Share.share(sharePayload);
      return true;
    } catch {
      return false;
    }
  }

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      const webPayload: ShareData = {
        title: options.title,
        text: options.text,
        url: options.url,
      };

      if (options.imageUrl) {
        try {
          const response = await fetch(options.imageUrl);
          const blob = await response.blob();
          const ext = blob.type.split('/')[1] ?? 'jpg';
          const file = new File([blob], `share.${ext}`, { type: blob.type });
          if (navigator.canShare?.({ files: [file] })) {
            webPayload.files = [file];
          }
        } catch {
          // Fall through without image
        }
      }

      await navigator.share(webPayload);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function canShare(): boolean {
  return (
    isNativeApp() || (typeof navigator !== 'undefined' && 'share' in navigator)
  );
}

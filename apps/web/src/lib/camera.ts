import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativeApp } from '@/lib/capacitor';

export { CameraSource } from '@capacitor/camera';

export interface PickImageOptions {
  source?: CameraSource;
  quality?: number;
  width?: number;
  height?: number;
  allowEditing?: boolean;
}

export interface PickImageResult {
  /** The selected image file, or null if cancelled / unavailable. */
  file: File | null;
  /** True when the native camera plugin handled the request (even if cancelled). */
  native: boolean;
}

/**
 * Pick an image using the native camera or photo gallery.
 *
 * Returns `{ file, native }`:
 * - `native: true`  → the native picker ran (file is non-null on success, null on cancel).
 *   Callers should **not** fall back to `<input type="file">`.
 * - `native: false` → not on a native platform; callers should trigger a web file input.
 */
export async function pickImage(
  options: PickImageOptions = {},
): Promise<PickImageResult> {
  if (!isNativeApp()) return { file: null, native: false };

  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: options.source ?? CameraSource.Prompt,
      quality: options.quality ?? 90,
      width: options.width,
      height: options.height,
      allowEditing: options.allowEditing ?? false,
    });

    if (!photo.dataUrl) return { file: null, native: true };

    const response = await fetch(photo.dataUrl);
    const blob = await response.blob();
    const ext = photo.format === 'jpg' ? 'jpeg' : photo.format || 'jpeg';
    const mimeType = `image/${ext}`;
    return {
      file: new File([blob], `photo-${Date.now()}.${ext}`, { type: mimeType }),
      native: true,
    };
  } catch {
    // User cancelled or permission denied — still native, no web fallback
    return { file: null, native: true };
  }
}

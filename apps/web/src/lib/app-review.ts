import { InAppReview } from '@capacitor-community/in-app-review';
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '@/lib/capacitor';

const LAST_REVIEW_KEY = 'vara.appReview.lastPromptAt';
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Request an App Store / Play Store review.
 * Respects a 90-day cooldown so users aren't prompted too often.
 * Returns true if the prompt was shown, false if skipped.
 */
export async function maybePromptReview(): Promise<boolean> {
  if (!isNativeApp()) return false;

  const { value } = await Preferences.get({ key: LAST_REVIEW_KEY });
  if (value) {
    const last = parseInt(value, 10);
    if (Date.now() - last < COOLDOWN_MS) return false;
  }

  try {
    await InAppReview.requestReview();
    await Preferences.set({
      key: LAST_REVIEW_KEY,
      value: Date.now().toString(),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Unconditionally request a review (ignores cooldown).
 * Use only for explicit user-initiated "Rate this app" actions.
 */
export async function promptReview(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await InAppReview.requestReview();
    await Preferences.set({
      key: LAST_REVIEW_KEY,
      value: Date.now().toString(),
    });
  } catch {
    // Review prompt is best-effort
  }
}

import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '@/lib/capacitor';

const BIOMETRIC_ENABLED_KEY = 'vara.biometric.enabled';

// ─── Module-level cache ─────────────────────────────────────────────────────
// Avoids repeated Preferences reads and checkBiometry calls per page mount.
let cachedAvailable: boolean | null = null;
let cachedEnabled: boolean | null = null;

/**
 * Check whether the device supports biometric authentication.
 * Result is cached for the lifetime of the app session.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    const result = await BiometricAuth.checkBiometry();
    cachedAvailable = result.isAvailable;
    return cachedAvailable;
  } catch {
    cachedAvailable = false;
    return false;
  }
}

/**
 * Prompt for biometric authentication (Face ID / Touch ID / fingerprint).
 * Returns true if verified, false otherwise.
 */
export async function authenticateWithBiometric(
  reason: string = 'Verify your identity',
): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    await BiometricAuth.authenticate({
      reason,
      allowDeviceCredential: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has opted in to biometric lock.
 * Uses a module-level cache — invalidated only by setBiometricEnabled().
 */
export async function isBiometricEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false;
  if (cachedEnabled !== null) return cachedEnabled;
  const { value } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
  cachedEnabled = value === 'true';
  return cachedEnabled;
}

/**
 * Toggle biometric lock preference.
 * When enabling, verifies biometric first to confirm the user can authenticate.
 */
export async function setBiometricEnabled(enabled: boolean): Promise<boolean> {
  if (!isNativeApp()) return false;

  if (enabled) {
    const available = await isBiometricAvailable();
    if (!available) return false;

    const verified = await authenticateWithBiometric(
      'Confirm your identity to enable biometric lock',
    );
    if (!verified) return false;
  }

  await Preferences.set({
    key: BIOMETRIC_ENABLED_KEY,
    value: enabled ? 'true' : 'false',
  });
  // Invalidate cache
  cachedEnabled = enabled;
  return true;
}

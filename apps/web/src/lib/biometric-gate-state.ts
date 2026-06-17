/**
 * Shared biometric gate state.
 *
 * Lives in its own module to avoid a circular dependency between
 * main.tsx (which sets up the Capacitor listeners) and BiometricGate
 * (which reads React auth state).
 */

/** True once the /me query confirms the user is authenticated. */
let userAuthenticated = false;

/** Assigned by main.tsx's Capacitor setup block. */
let _promptBiometric: (() => Promise<void>) | undefined;

/** Called by BiometricGate when auth state changes. */
export function setBiometricAuthState(authenticated: boolean) {
  userAuthenticated = authenticated;
}

/** Read the current auth flag (used by promptBiometric in main.tsx). */
export function isBiometricAuthConfirmed(): boolean {
  return userAuthenticated;
}

/** Register the native prompt function (called once from main.tsx). */
export function registerBiometricPrompt(fn: () => Promise<void>) {
  _promptBiometric = fn;
}

/** Trigger biometric prompt from React (called by BiometricGate). */
export function triggerBiometricPrompt() {
  if (_promptBiometric) void _promptBiometric();
}

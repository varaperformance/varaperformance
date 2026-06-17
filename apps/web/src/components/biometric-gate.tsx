import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth';
import {
  setBiometricAuthState,
  triggerBiometricPrompt,
} from '@/lib/biometric-gate-state';

/**
 * Syncs the React-confirmed authentication state with the biometric
 * gate in main.tsx. When the /me query confirms the user is truly
 * authenticated (not just holding a stale local token), this component
 * updates the module-level flag and fires the initial biometric prompt.
 *
 * Render this inside AuthProvider so `useAuth()` has access to context.
 */
export function BiometricGate() {
  const { isAuthenticated } = useAuth();
  const prompted = useRef(false);

  useEffect(() => {
    setBiometricAuthState(isAuthenticated);

    // Fire biometric once on initial authenticated mount
    if (isAuthenticated && !prompted.current) {
      prompted.current = true;
      triggerBiometricPrompt();
    }

    // Reset so a fresh login triggers it again
    if (!isAuthenticated) {
      prompted.current = false;
    }
  }, [isAuthenticated]);

  return null;
}

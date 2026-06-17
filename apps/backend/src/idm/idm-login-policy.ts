export const isAccountTemporarilyLocked = (
  lockedUntil: Date | null | undefined,
  now: Date = new Date(),
): boolean => Boolean(lockedUntil && lockedUntil > now);

export const computeFailedLoginState = (
  currentFailedAttempts: number,
  maxFailedAttempts: number,
  lockoutDurationMinutes: number,
  now: Date = new Date(),
): {
  failedAttempts: number;
  shouldLock: boolean;
  lockedUntil: Date | null;
} => {
  const failedAttempts = currentFailedAttempts + 1;
  const shouldLock = failedAttempts >= maxFailedAttempts;

  return {
    failedAttempts,
    shouldLock,
    lockedUntil: shouldLock
      ? new Date(now.getTime() + lockoutDurationMinutes * 60 * 1000)
      : null,
  };
};

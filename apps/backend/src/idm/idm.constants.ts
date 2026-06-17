// SOC2: Maximum failed login attempts before account lockout.
export const MAX_FAILED_ATTEMPTS = 5;
// SOC2: Account lockout duration in minutes.
export const LOCKOUT_DURATION_MINUTES = 30;
// SOC2: Number of previous passwords checked for reuse.
export const PASSWORD_HISTORY_COUNT = 12;

export const DEFAULT_USER_ROLE = 'User';
export const DEFAULT_PRIVATE_MODE_ROW_ID = 'default';
export const CODES_PER_REFERRED_REGISTRATION = 5;

export const normalizeRegistrationCode = (value: string): string =>
  value.trim().toUpperCase();

import {
  computeFailedLoginState,
  isAccountTemporarilyLocked,
} from './idm-login-policy';

describe('idm-login-policy', () => {
  it('identifies active lock windows', () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    const future = new Date('2026-03-24T12:10:00.000Z');
    const past = new Date('2026-03-24T11:59:00.000Z');

    expect(isAccountTemporarilyLocked(future, now)).toBe(true);
    expect(isAccountTemporarilyLocked(past, now)).toBe(false);
    expect(isAccountTemporarilyLocked(null, now)).toBe(false);
  });

  it('increments failed attempts without lock before threshold', () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    const result = computeFailedLoginState(2, 5, 30, now);

    expect(result.failedAttempts).toBe(3);
    expect(result.shouldLock).toBe(false);
    expect(result.lockedUntil).toBeNull();
  });

  it('locks account and sets lock-until at threshold', () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    const result = computeFailedLoginState(4, 5, 30, now);

    expect(result.failedAttempts).toBe(5);
    expect(result.shouldLock).toBe(true);
    expect(result.lockedUntil?.toISOString()).toBe('2026-03-24T12:30:00.000Z');
  });
});

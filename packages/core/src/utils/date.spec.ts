import { describe, it, expect } from 'vitest';
import {
  addCalendarDaysToDateKey,
  endOfZonedDayUtc,
  formatDateInTimezone,
  startOfZonedDayUtc,
} from './date';

describe('Zoned day boundaries (HR / health daily summaries)', () => {
  it('buckets a UTC sample into the previous calendar day in US time', () => {
    // 2026-04-20 10:00 UTC = morning Apr 20 in Europe; in Chicago still Apr 20 early
    const t = new Date('2026-04-20T10:00:00.000Z');
    expect(formatDateInTimezone(t, 'America/Chicago')).toBe('2026-04-20');
  });

  it('buckets a UTC sample into the next calendar day vs UTC (evening local)', () => {
    // 7pm in Chicago (CDT, UTC-5) on Apr 20 = Apr 21 00:00 UTC
    const t = new Date('2026-04-21T00:00:00.000Z');
    expect(formatDateInTimezone(t, 'America/Chicago')).toBe('2026-04-20');
  });

  it('aligns start/end of zoned day with formatDateInTimezone for same date key', () => {
    const tz = 'America/Chicago';
    const key = '2026-04-20';
    const start = startOfZonedDayUtc(key, tz);
    const end = endOfZonedDayUtc(key, tz);
    expect(formatDateInTimezone(start, tz)).toBe(key);
    expect(formatDateInTimezone(end, tz)).toBe(key);
    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it('increments date keys in UTC calendar', () => {
    expect(addCalendarDaysToDateKey('2026-01-31', 1)).toBe('2026-02-01');
  });
});

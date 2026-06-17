/**
 * Date Utilities for Vara Performance
 *
 * Centralized date handling to avoid timezone issues across frontend and backend.
 *
 * Strategy:
 * - All timestamps are stored in UTC in the database
 * - User's profile timezone (IANA format, e.g., 'America/New_York') is used for display
 * - Date-only queries use the user's timezone to determine "today", "yesterday", etc.
 *
 * Problem: JavaScript's `new Date('2026-03-03')` parses date-only strings as UTC midnight,
 * which can shift dates when converted to local time (e.g., '2026-03-03' becomes Mar 2 in PST).
 *
 * Solution: Always parse date strings explicitly as local dates, and use consistent
 * formatting throughout the application with timezone awareness.
 */

// ==================== TIMEZONE-AWARE FUNCTIONS ====================

/**
 * Format a UTC date to YYYY-MM-DD string in the user's timezone.
 *
 * @param date - Date object (represents UTC time)
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Date string in YYYY-MM-DD format for the given timezone
 *
 * @example
 * // UTC midnight March 3 -> different dates depending on timezone
 * formatDateInTimezone(new Date('2026-03-03T00:00:00Z'), 'America/Los_Angeles') // '2026-03-02'
 * formatDateInTimezone(new Date('2026-03-03T00:00:00Z'), 'America/New_York') // '2026-03-02'
 * formatDateInTimezone(new Date('2026-03-03T00:00:00Z'), 'Europe/London') // '2026-03-03'
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Returns YYYY-MM-DD format
}

/**
 * Get today's date as YYYY-MM-DD string in the user's timezone.
 *
 * @param timezone - IANA timezone string
 * @returns Today's date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone: string): string {
  return formatDateInTimezone(new Date(), timezone);
}

/**
 * Get a date N days ago as YYYY-MM-DD string in the user's timezone.
 *
 * @param days - Number of days to subtract
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDaysAgoInTimezone(days: number, timezone: string): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateInTimezone(date, timezone);
}

/**
 * Format a UTC date for display in the user's timezone.
 *
 * @param date - Date object (UTC)
 * @param timezone - IANA timezone string
 * @param options - Intl.DateTimeFormatOptions (defaults to 'Mar 3, 2026')
 * @returns Formatted date string
 */
export function formatDisplayDateInTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
): string {
  return date.toLocaleDateString('en-US', { ...options, timeZone: timezone });
}

/**
 * Get relative date string (Today, Yesterday, or formatted date) in user's timezone.
 *
 * @param date - Date to format (UTC)
 * @param timezone - IANA timezone string
 * @returns Relative or formatted date string
 */
export function getRelativeDateInTimezone(
  date: Date,
  timezone: string,
): string {
  const dateStr = formatDateInTimezone(date, timezone);
  const todayStr = getTodayInTimezone(timezone);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateInTimezone(yesterday, timezone);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  return formatDisplayDateInTimezone(date, timezone, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Create a UTC timestamp for a specific date in the user's timezone.
 * Useful for logging entries at noon in user's local time to avoid date drift.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone string
 * @param hour - Hour in 24h format (default 12 for noon)
 * @returns ISO string representing the specified time in UTC
 */
export function createTimestampForDate(
  dateStr: string,
  timezone: string,
  hour = 12,
): string {
  // Parse the date parts
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create a formatter that shows us the UTC offset for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    timeZoneName: 'shortOffset',
  });

  // Get the current offset for DST-awareness
  const parts = formatter.formatToParts(
    new Date(year!, month! - 1, day!, hour),
  );
  const offsetPart = parts.find((p) => p.type === 'timeZoneName');
  const offsetStr = offsetPart?.value || 'GMT';

  // Parse offset like "GMT-5" or "GMT+2"
  const offsetMatch = offsetStr.match(/GMT([+-]?)(\d+)?/);
  let offsetHours = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    offsetHours = sign * parseInt(offsetMatch[2] || '0', 10);
  }

  // Create the date in UTC by subtracting the offset
  const utcDate = new Date(
    Date.UTC(year!, month! - 1, day!, hour - offsetHours, 0, 0, 0),
  );
  return utcDate.toISOString();
}

/**
 * Convert a YYYY-MM-DD date key to UTC midnight Date.
 *
 * This keeps date-only persistence consistent across services.
 */
export function createUtcDateKey(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Get the user's timezone from their profile, or fall back to browser timezone.
 *
 * @param profileTimezone - User's profile timezone (may be null/undefined)
 * @returns IANA timezone string
 */
export function getEffectiveTimezone(profileTimezone?: string | null): string {
  return profileTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Add calendar days to a YYYY-MM-DD string (date-only, UTC date arithmetic on parts).
 * Used to chain zoned day boundaries; not for "business days" in a locale.
 */
export function addCalendarDaysToDateKey(
  dateKey: string,
  days: number,
): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/**
 * First instant (UTC) where the user's zoned date is `dateKey` (e.g. start of that calendar day in `timeZone`).
 * Binary search — needed because JS has no first-class IANA "midnight" without extra deps.
 */
export function startOfZonedDayUtc(dateKey: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const lo = new Date(Date.UTC(y, m - 1, d - 1, 0, 0, 0, 0)).getTime();
  const hi = new Date(Date.UTC(y, m - 1, d + 2, 0, 0, 0, 0)).getTime();
  let first = -1;
  let left = lo;
  let right = hi;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const key = formatDateInTimezone(new Date(mid), timeZone);
    if (key < dateKey) {
      left = mid + 1;
    } else if (key > dateKey) {
      right = mid - 1;
    } else {
      first = mid;
      right = mid - 1;
    }
  }
  if (first === -1) {
    return new Date(`${dateKey}T00:00:00.000Z`);
  }
  return new Date(first);
}

/**
 * Last millisecond of `dateKey` in the user's time zone, as a UTC `Date`.
 */
export function endOfZonedDayUtc(dateKey: string, timeZone: string): Date {
  const next = addCalendarDaysToDateKey(dateKey, 1);
  return new Date(startOfZonedDayUtc(next, timeZone).getTime() - 1);
}

// ==================== LOCAL TIMEZONE FUNCTIONS (LEGACY) ====================
// These use browser's local timezone. Prefer timezone-aware functions above.

/**
 * Parse a date string (YYYY-MM-DD) as local midnight.
 * Use this instead of `new Date(dateStr)` for date-only strings.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param endOfDay - If true, returns 23:59:59.999 instead of 00:00:00.000
 * @returns Date object in local timezone
 *
 * @example
 * // Instead of: new Date('2026-03-03') // UTC midnight, may shift in local time
 * // Use: parseLocalDate('2026-03-03') // Local midnight
 */
export function parseLocalDate(dateStr: string, endOfDay = false): Date {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day)
  ) {
    throw new Error(
      `Invalid date string: ${dateStr}. Expected format: YYYY-MM-DD`,
    );
  }
  if (endOfDay) {
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Format a Date object to YYYY-MM-DD string (local timezone).
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * formatDateString(new Date()) // '2026-03-03'
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as a YYYY-MM-DD string (local timezone).
 */
export function getTodayString(): string {
  return formatDateString(new Date());
}

/**
 * Get a date N days ago as a Date object (local midnight).
 *
 * @param days - Number of days to subtract from today
 * @returns Date object at local midnight
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get a date N days ago as a YYYY-MM-DD string.
 *
 * @param days - Number of days to subtract from today
 * @returns Date string in YYYY-MM-DD format
 */
export function getDaysAgoString(days: number): string {
  return formatDateString(getDaysAgo(days));
}

/**
 * Calculate the start of a date range based on a preset.
 *
 * @param preset - 'today' | '7d' | '30d' | '60d' | '90d' | '1y'
 * @returns Object with startDate and endDate strings
 */
export function getDateRangeFromPreset(preset: string): {
  startDate: string;
  endDate: string;
} {
  const endDate = getTodayString();

  switch (preset) {
    case 'today':
      return { startDate: endDate, endDate };
    case '7d':
      return { startDate: getDaysAgoString(7), endDate };
    case '30d':
      return { startDate: getDaysAgoString(30), endDate };
    case '60d':
      return { startDate: getDaysAgoString(60), endDate };
    case '90d':
      return { startDate: getDaysAgoString(90), endDate };
    case '1y':
      return { startDate: getDaysAgoString(365), endDate };
    default:
      return { startDate: getDaysAgoString(30), endDate };
  }
}

/**
 * Check if a date string is valid YYYY-MM-DD format.
 *
 * @param dateStr - String to validate
 * @returns true if valid date string
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Get the start of a week (Sunday) for a given date.
 *
 * @param date - Date to get week start for
 * @returns Date at local midnight of the Sunday
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the start of a month for a given date.
 *
 * @param date - Date to get month start for
 * @returns Date at local midnight of the 1st
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get the end of a month for a given date.
 *
 * @param date - Date to get month end for
 * @returns Date at 23:59:59.999 of the last day
 */
export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Calculate the number of days between two dates.
 *
 * @param start - Start date
 * @param end - End date
 * @returns Number of days (rounded)
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Format a date for display (e.g., "Mar 3, 2026").
 *
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDisplayDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
): string {
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get relative time string (e.g., "Today", "Yesterday", "Mar 3").
 *
 * @param date - Date to format
 * @returns Relative or formatted date string
 */
export function getRelativeDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDateString(date) === formatDateString(today)) {
    return 'Today';
  }
  if (formatDateString(date) === formatDateString(yesterday)) {
    return 'Yesterday';
  }
  return formatDisplayDate(date, { month: 'short', day: 'numeric' });
}

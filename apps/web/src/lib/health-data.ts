import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import type {
  HealthDataType,
  HealthSample,
  AggregatedSample,
  Workout,
} from '@capgo/capacitor-health';

// Re-export types consumers need
export type { HealthSample, AggregatedSample, Workout };

/** Convert a UTC ISO string to a local YYYY-MM-DD date string. */
export function toLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Data types Vara requests read access to */
const READ_TYPES: HealthDataType[] = [
  'steps',
  'weight',
  'heartRate',
  'sleep',
  'workouts',
];

/** Data types Vara requests write access to (note: 'workouts' is handled
 *  separately by the plugin via writeWorkout — it cannot appear here) */
const WRITE_TYPES: HealthDataType[] = ['weight'];

/**
 * Check if the native health SDK (HealthKit / Health Connect) is available.
 * Returns false on web.
 */
export async function isHealthAvailable(): Promise<boolean> {
  if (Capacitor.getPlatform() === 'web') return false;
  try {
    const { available } = await Health.isAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Request read/write health permissions from the user.
 * Must be called after the user grants consent in the app.
 */
export async function requestHealthPermissions(): Promise<{
  granted: boolean;
  error?: string;
}> {
  if (Capacitor.getPlatform() === 'web')
    return { granted: false, error: 'Not available on web' };
  try {
    const status = await Health.requestAuthorization({
      read: READ_TYPES,
      write: WRITE_TYPES,
    });
    if (status.readAuthorized.length > 0) {
      return { granted: true };
    }
    return {
      granted: false,
      error: `No read permissions granted. Denied: ${status.readDenied.join(', ') || 'none reported'}`,
    };
  } catch (err) {
    return {
      granted: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check current authorization status without prompting the user.
 */
export async function hasHealthPermissions(): Promise<boolean> {
  if (Capacitor.getPlatform() === 'web') return false;
  try {
    const status = await Health.checkAuthorization({
      read: READ_TYPES,
      write: WRITE_TYPES,
    });
    // Consider authorized if at least steps are readable
    return status.readAuthorized.includes('steps');
  } catch {
    return false;
  }
}

/**
 * Read today's cumulative step count.
 */
export async function readTodaySteps(): Promise<number> {
  if (Capacitor.getPlatform() === 'web') return 0;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { samples } = await Health.queryAggregated({
    dataType: 'steps',
    startDate: startOfDay.toISOString(),
    endDate: now.toISOString(),
    bucket: 'day',
    aggregation: 'sum',
  });

  return samples.length > 0 ? samples[0].value : 0;
}

/**
 * Read daily step totals for a date range.
 */
export async function readSteps(
  from: string,
  to: string,
): Promise<{ date: string; steps: number }[]> {
  if (Capacitor.getPlatform() === 'web') return [];

  // Use local midnight to ensure correct day boundaries
  const startOfFrom = new Date(from + 'T00:00:00');
  const { samples } = await Health.queryAggregated({
    dataType: 'steps',
    startDate: startOfFrom.toISOString(),
    endDate: new Date(to).toISOString(),
    bucket: 'day',
    aggregation: 'sum',
  });

  return samples.map((s: AggregatedSample) => ({
    date: toLocalDate(s.startDate),
    steps: s.value,
  }));
}

/**
 * Read sleep sessions for a date range.
 */
export async function readSleepSessions(
  from: string,
  to: string,
): Promise<HealthSample[]> {
  if (Capacitor.getPlatform() === 'web') return [];

  const { samples } = await Health.readSamples({
    dataType: 'sleep',
    startDate: new Date(from).toISOString(),
    endDate: new Date(to).toISOString(),
    limit: 500,
  });

  return samples;
}

/**
 * Read heart rate data points for a date range.
 */
export async function readHeartRateSamples(
  from: string,
  to: string,
): Promise<HealthSample[]> {
  if (Capacitor.getPlatform() === 'web') return [];

  const { samples } = await Health.readSamples({
    dataType: 'heartRate',
    startDate: new Date(from).toISOString(),
    endDate: new Date(to).toISOString(),
    limit: 5000,
  });

  return samples;
}

/**
 * Write a completed Vara workout session to Apple Health / Health Connect.
 */
export async function writeWorkoutSession(session: {
  startDate: string;
  endDate: string;
  calories?: number;
}): Promise<void> {
  if (Capacitor.getPlatform() === 'web') return;

  // Write as active calories burned for the workout period
  if (session.calories && session.calories > 0) {
    await Health.saveSample({
      dataType: 'calories',
      value: session.calories,
      startDate: session.startDate,
      endDate: session.endDate,
    });
  }
}

/**
 * Query workout sessions from the device health store.
 */
export async function readWorkouts(
  from: string,
  to: string,
): Promise<Workout[]> {
  if (Capacitor.getPlatform() === 'web') return [];

  const { workouts } = await Health.queryWorkouts({
    startDate: new Date(from).toISOString(),
    endDate: new Date(to).toISOString(),
    limit: 100,
  });

  return workouts;
}

/**
 * Read weight samples for a date range.
 */
export async function readWeightSamples(
  from: string,
  to: string,
): Promise<HealthSample[]> {
  if (Capacitor.getPlatform() === 'web') return [];

  const { samples } = await Health.readSamples({
    dataType: 'weight',
    startDate: new Date(from).toISOString(),
    endDate: new Date(to).toISOString(),
    limit: 100,
  });

  return samples;
}

/**
 * Write a weight sample to Apple Health / Health Connect.
 */
export async function writeWeightSample(
  weight: number,
  date: string,
): Promise<void> {
  if (Capacitor.getPlatform() === 'web') return;

  await Health.saveSample({
    dataType: 'weight',
    value: weight,
    startDate: date,
    endDate: date,
  });
}

/**
 * Read water/hydration samples for a date range (aggregated daily).
 * The @capgo/capacitor-health plugin does not support 'water' as a
 * HealthDataType — water tracking is manual-only via the Vara backend.
 */
export async function readWaterSamples(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _from: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _to: string,
): Promise<{ date: string; amount: number }[]> {
  return [];
}

/**
 * Write a water intake sample to Apple Health / Health Connect.
 * Currently a no-op — the @capgo/capacitor-health plugin does not support
 * water as a writable data type.
 */
export async function writeWaterSample(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _amount: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _date: string,
): Promise<void> {
  // No-op: plugin does not support water writes
}

/**
 * Get the current platform source name for health data attribution.
 */
export function getHealthSource(): 'APPLE_HEALTH' | 'GOOGLE_FIT' | 'MANUAL' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'APPLE_HEALTH';
  if (platform === 'android') return 'GOOGLE_FIT';
  return 'MANUAL';
}

import { isNativeApp } from '@/lib/capacitor';
import {
  getHealthSource,
  hasHealthPermissions,
  readSteps,
  readSleepSessions,
  readHeartRateSamples,
  readWeightSamples,
  readWaterSamples,
  readWorkouts,
} from '@/lib/health-data';
import api from '@/lib/api';
import { toLocalDate } from '@/lib/health-data';
import {
  downsampleHeartRateSamplesToUtcMinute,
  mapWorkoutType,
} from '@varaperformance/core';
import type {
  HealthSyncPreference,
  HealthSyncStatusResponse,
  SuccessResponse,
} from '@varaperformance/core';

/**
 * Sync health data from the device health store to the backend.
 *
 * **First sync** (no previous sync log): reads the last 30 days of data.
 * **Subsequent syncs**: reads from the earliest `lastSyncedAt` across all
 * data types up to now.
 *
 * Reads ALL available data from the device, then chunks it into batches
 * sized to fit the backend schema limits. Multiple POST requests are sent
 * if data exceeds a single batch. Results are aggregated.
 *
 * Called on app open and resume (Capacitor `appStateChange`).
 */

// Per-request batch limits — must match SyncHealthDataSchema .max() values
const BATCH_LIMITS = {
  steps: 200,
  sleep: 200,
  heartRate: 2000,
  weight: 200,
  water: 200,
  workouts: 100,
} as const;

let healthSyncInFlight = 0;
let protectedHealthBlockedUntil = 0;

const PROTECTED_HEALTH_COOLDOWN_MS = 5 * 60 * 1000;

function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  if (typeof error === 'object') {
    const errObj = error as {
      message?: unknown;
      errorMessage?: unknown;
      response?: { data?: unknown };
    };

    if (typeof errObj.errorMessage === 'string') return errObj.errorMessage;
    if (typeof errObj.message === 'string') return errObj.message;

    const responseData = errObj.response?.data;
    if (responseData && typeof responseData === 'object') {
      const dataObj = responseData as {
        message?: unknown;
        errorMessage?: unknown;
      };
      if (typeof dataObj.errorMessage === 'string') return dataObj.errorMessage;
      if (typeof dataObj.message === 'string') return dataObj.message;
    }
  }

  return String(error);
}

function isProtectedHealthDataError(error: unknown): boolean {
  return extractErrorMessage(error)
    .toLowerCase()
    .includes('protected health data is inaccessible');
}

function emitHealthSyncBusy(active: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('vara:health-sync-busy', { detail: { active } }),
  );
}

function beginHealthSync() {
  healthSyncInFlight += 1;
  if (healthSyncInFlight === 1) {
    emitHealthSyncBusy(true);
  }
}

function endHealthSync() {
  healthSyncInFlight = Math.max(healthSyncInFlight - 1, 0);
  if (healthSyncInFlight === 0) {
    emitHealthSyncBusy(false);
  }
}

export async function syncHealthToBackend(
  prefs?: HealthSyncPreference | null,
): Promise<{
  stepsUpserted?: number;
  sleepUpserted?: number;
  heartRateInserted?: number;
  weightUpserted?: number;
  waterUpserted?: number;
  workoutsImported?: number;
} | null> {
  if (!isNativeApp()) return null;
  beginHealthSync();

  try {
    if (Date.now() < protectedHealthBlockedUntil) {
      return null;
    }

    const permitted = await hasHealthPermissions();
    if (!permitted) {
      console.warn('[health-sync] skipped — no health permissions granted');
      return null;
    }

    const source = getHealthSource();
    if (source === 'MANUAL') return null;

    // Determine sync window: 30 days for first sync, last-sync-date for subsequent
    const now = new Date();
    let fromDate: Date;
    try {
      const { data: statusResp } = await api.get<
        SuccessResponse<HealthSyncStatusResponse[]>
      >('health-data/sync/status');
      const statuses = statusResp?.data ?? [];
      const syncDates = statuses
        .map((s) => s.lastSyncedAt)
        .filter((d): d is string => d !== null)
        .map((d) => new Date(d).getTime());

      if (syncDates.length > 0) {
        // Use the earliest lastSyncedAt — ensures no data type is missed
        fromDate = new Date(Math.min(...syncDates));
        // Add a 1-day overlap buffer to catch any edge-case gaps
        fromDate.setDate(fromDate.getDate() - 1);
      } else {
        // First sync — go back 30 days
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 30);
      }
    } catch {
      // If status endpoint fails, fall back to 30 days
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 30);
    }

    const from = formatDate(fromDate);
    const to = now.toISOString();

    try {
      // Default: all reads enabled when no preferences exist
      const p = prefs ?? {
        readSteps: true,
        readSleep: true,
        readHeartRate: true,
        readWeight: true,
        readWater: true,
        readWorkouts: true,
        writeWeight: false,
        writeWater: false,
        writeWorkouts: true,
      };

      const [
        stepSamples,
        sleepSamples,
        hrSamples,
        weightSamples,
        waterSamples,
        workoutSamples,
      ] = await Promise.all([
        p.readSteps ? readSteps(from, to) : Promise.resolve([]),
        p.readSleep ? readSleepSessions(from, to) : Promise.resolve([]),
        p.readHeartRate ? readHeartRateSamples(from, to) : Promise.resolve([]),
        p.readWeight ? readWeightSamples(from, to) : Promise.resolve([]),
        p.readWater ? readWaterSamples(from, to) : Promise.resolve([]),
        p.readWorkouts ? readWorkouts(from, to) : Promise.resolve([]),
      ]);

      // ─── Transform device data to sync format (no truncation) ─────────

      const steps = stepSamples.map((s) => ({
        date: s.date,
        steps: Math.round(s.steps),
      }));

      // HealthKit returns individual sleep segments (REM, deep, awake, etc.).
      // Deduplicate to one session per night by keeping the widest time span.
      const sleepByDate = new Map<
        string,
        { startTime: string; endTime: string }
      >();
      for (const s of sleepSamples) {
        const date = toLocalDate(s.startDate);
        const existing = sleepByDate.get(date);
        if (!existing) {
          sleepByDate.set(date, { startTime: s.startDate, endTime: s.endDate });
        } else {
          if (s.startDate < existing.startTime)
            existing.startTime = s.startDate;
          if (s.endDate > existing.endTime) existing.endTime = s.endDate;
        }
      }
      const sleep = Array.from(sleepByDate.entries()).map(
        ([date, { startTime, endTime }]) => {
          const durationHours = Math.min(
            (new Date(endTime).getTime() - new Date(startTime).getTime()) /
              3_600_000,
            24,
          );
          return {
            date,
            startTime,
            endTime,
            duration: Math.round(durationHours * 100) / 100,
          };
        },
      );

      const heartRate = downsampleHeartRateSamplesToUtcMinute(
        hrSamples.map((s) => ({
          timestamp: s.startDate,
          bpm: Math.round(s.value),
        })),
      );

      const weight = weightSamples.map((s) => ({
        date: toLocalDate(s.startDate),
        value: Math.round(s.value * 100) / 100,
      }));

      const water = waterSamples.map((s) => ({
        date: s.date,
        amount: s.amount,
      }));

      const workouts = workoutSamples.map((w) => ({
        name: mapWorkoutType(w.workoutType),
        startDate: w.startDate,
        endDate: w.endDate,
        calories: w.totalEnergyBurned ?? 0,
        duration: w.duration ?? 0,
      }));

      // Only sync if there's data
      if (
        !steps.length &&
        !sleep.length &&
        !heartRate.length &&
        !weight.length &&
        !water.length &&
        !workouts.length
      ) {
        console.warn(
          '[health-sync] skipped — no health data found since',
          from,
        );
        return null;
      }

      console.info(
        `[health-sync] read from device: ${steps.length} step days, ${sleep.length} sleep sessions, ${heartRate.length} HR, ${weight.length} weight, ${water.length} water, ${workouts.length} workouts`,
      );

      // ─── Chunk into batches and send ────────────────────────────────

      // Calculate how many batches we need (driven by whichever data type
      // has the most entries relative to its batch limit)
      const batchCount = Math.max(
        1,
        Math.ceil(steps.length / BATCH_LIMITS.steps),
        Math.ceil(sleep.length / BATCH_LIMITS.sleep),
        Math.ceil(heartRate.length / BATCH_LIMITS.heartRate),
        Math.ceil(weight.length / BATCH_LIMITS.weight),
        Math.ceil(water.length / BATCH_LIMITS.water),
        Math.ceil(workouts.length / BATCH_LIMITS.workouts),
      );

      const totals = {
        stepsUpserted: 0,
        sleepUpserted: 0,
        heartRateInserted: 0,
        weightUpserted: 0,
        waterUpserted: 0,
        workoutsImported: 0,
      };

      for (let i = 0; i < batchCount; i++) {
        const batchSteps = steps.slice(
          i * BATCH_LIMITS.steps,
          (i + 1) * BATCH_LIMITS.steps,
        );
        const batchSleep = sleep.slice(
          i * BATCH_LIMITS.sleep,
          (i + 1) * BATCH_LIMITS.sleep,
        );
        const batchHr = heartRate.slice(
          i * BATCH_LIMITS.heartRate,
          (i + 1) * BATCH_LIMITS.heartRate,
        );
        const batchWeight = weight.slice(
          i * BATCH_LIMITS.weight,
          (i + 1) * BATCH_LIMITS.weight,
        );
        const batchWater = water.slice(
          i * BATCH_LIMITS.water,
          (i + 1) * BATCH_LIMITS.water,
        );
        const batchWorkouts = workouts.slice(
          i * BATCH_LIMITS.workouts,
          (i + 1) * BATCH_LIMITS.workouts,
        );

        const payload = {
          source,
          steps: batchSteps.length ? batchSteps : undefined,
          sleep: batchSleep.length ? batchSleep : undefined,
          heartRate: batchHr.length ? batchHr : undefined,
          weight: batchWeight.length ? batchWeight : undefined,
          water: batchWater.length ? batchWater : undefined,
          workouts: batchWorkouts.length ? batchWorkouts : undefined,
        };

        // Skip empty batches (can happen when data types have uneven counts)
        if (
          !batchSteps.length &&
          !batchSleep.length &&
          !batchHr.length &&
          !batchWeight.length &&
          !batchWater.length &&
          !batchWorkouts.length
        ) {
          continue;
        }

        console.info(
          `[health-sync] batch ${i + 1}/${batchCount}: ${batchSteps.length} steps, ${batchSleep.length} sleep, ${batchHr.length} HR, ${batchWeight.length} weight, ${batchWater.length} water, ${batchWorkouts.length} workouts`,
        );

        const response = await api.post('health-data/sync', payload);
        const result = response.data?.data;
        if (result) {
          totals.stepsUpserted += result.stepsUpserted ?? 0;
          totals.sleepUpserted += result.sleepUpserted ?? 0;
          totals.heartRateInserted += result.heartRateInserted ?? 0;
          totals.weightUpserted += result.weightUpserted ?? 0;
          totals.waterUpserted += result.waterUpserted ?? 0;
          totals.workoutsImported += result.workoutsImported ?? 0;
        }
      }

      console.info('[health-sync] totals:', JSON.stringify(totals));

      return totals;
    } catch (err: unknown) {
      if (isProtectedHealthDataError(err)) {
        protectedHealthBlockedUntil = Date.now() + PROTECTED_HEALTH_COOLDOWN_MS;
        console.info(
          '[health-sync] skipped — protected health data inaccessible (will retry later)',
        );
        return null;
      }

      // Log the full error so it's visible in Xcode / Safari Web Inspector
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response: { status: number; data: unknown };
        };
        console.error(
          '[health-sync] HTTP error:',
          axiosErr.response.status,
          JSON.stringify(axiosErr.response.data),
        );
      } else {
        console.error('[health-sync] failed:', err);
      }
      return null;
    }
  } finally {
    endHealthSync();
  }
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import type { WorkoutSessionSource } from '@generated/prisma';
import type {
  LogSteps,
  StepTrendQuery,
  LogSleep,
  SleepTrendQuery,
  LogHeartRateBatch,
  HeartRateQuery,
  SyncHealthData,
  StepLogResponse,
  SleepLogResponse,
  HeartRateLogResponse,
  HeartRateDailySummary,
  StepsTodayResponse,
  SyncHealthDataResponse,
  HealthSyncStatusResponse,
  HealthSyncPreferenceResponse,
  UpdateHealthSyncPreference,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';
import {
  downsampleHeartRateSamplesToUtcMinute,
  endOfZonedDayUtc,
  formatDateInTimezone,
  getEffectiveTimezone,
  getTodayInTimezone,
  startOfZonedDayUtc,
} from '@varaperformance/core';

@Injectable()
export class HealthDataService {
  private readonly logger = new Logger(HealthDataService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  // ─── Steps ──────────────────────────────────────────────────────────────────

  async logSteps(
    userId: string,
    data: LogSteps,
  ): Promise<SuccessResponse<StepLogResponse>> {
    const date = new Date(data.date + 'T00:00:00.000Z');
    const source = data.source ?? 'MANUAL';

    const log = await this.db.stepLog.upsert({
      where: { userId_date_source: { userId, date, source } },
      create: { userId, date, steps: data.steps, source },
      update: { steps: data.steps },
    });

    return {
      success: true,
      data: {
        id: log.id,
        date: this.formatDate(log.date),
        steps: log.steps,
        source: log.source,
        createdAt: log.createdAt.toISOString(),
      },
    };
  }

  async getStepsToday(
    userId: string,
  ): Promise<SuccessResponse<StepsTodayResponse>> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const tz = getEffectiveTimezone(profile?.timezone);
    const today = getTodayInTimezone(tz);
    const todayDate = new Date(today + 'T00:00:00.000Z');

    const [logs, goal] = await Promise.all([
      this.db.stepLog.findMany({
        where: { userId, date: todayDate },
        select: { steps: true },
      }),
      this.db.lifestyleGoal.findUnique({
        where: { userId },
        select: { dailySteps: true },
      }),
    ]);

    // Sum across all sources for today
    const steps = logs.reduce((sum, l) => sum + l.steps, 0);
    const goalSteps = goal?.dailySteps ?? 10_000;
    const percent = goalSteps > 0 ? Math.round((steps / goalSteps) * 100) : 0;

    return { success: true, data: { steps, goal: goalSteps, percent } };
  }

  async getStepsTrend(
    userId: string,
    query: StepTrendQuery,
  ): Promise<
    SuccessResponse<{
      days: Array<{ date: string; steps: number; sources: string[] }>;
    }>
  > {
    const from = new Date(query.from + 'T00:00:00.000Z');
    const to = new Date(query.to + 'T00:00:00.000Z');

    const logs = await this.db.stepLog.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: { date: true, steps: true, source: true },
      orderBy: { date: 'asc' },
    });

    // Aggregate across sources per day
    const buckets: Record<string, { steps: number; sources: Set<string> }> = {};
    const cursor = new Date(from);
    while (cursor <= to) {
      buckets[this.formatDate(cursor)] = { steps: 0, sources: new Set() };
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const log of logs) {
      const key = this.formatDate(log.date);
      if (buckets[key] !== undefined) {
        buckets[key].steps += log.steps;
        buckets[key].sources.add(log.source);
      }
    }

    const days = Object.entries(buckets).map(([date, { steps, sources }]) => ({
      date,
      steps,
      sources: [...sources],
    }));

    return { success: true, data: { days } };
  }

  async deleteStepLog(
    userId: string,
    logId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const log = await this.db.stepLog.findFirst({
      where: { id: logId, userId },
      select: { id: true },
    });

    if (!log) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Step log not found' },
      };
    }

    await this.db.stepLog.delete({ where: { id: logId } });
    return { success: true, data: { deleted: true } };
  }

  // ─── Sleep ──────────────────────────────────────────────────────────────────

  async logSleep(
    userId: string,
    data: LogSleep,
  ): Promise<SuccessResponse<SleepLogResponse>> {
    const date = new Date(data.date + 'T00:00:00.000Z');
    const source = data.source ?? 'MANUAL';

    const log = await this.db.sleepLog.upsert({
      where: { userId_date_source: { userId, date, source } },
      create: {
        userId,
        date,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        duration: data.duration,
        source,
      },
      update: {
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        duration: data.duration,
      },
    });

    return {
      success: true,
      data: {
        id: log.id,
        date: this.formatDate(log.date),
        startTime: log.startTime.toISOString(),
        endTime: log.endTime.toISOString(),
        duration: log.duration,
        source: log.source,
        createdAt: log.createdAt.toISOString(),
      },
    };
  }

  async getSleepTrend(
    userId: string,
    query: SleepTrendQuery,
  ): Promise<
    SuccessResponse<{
      days: Array<{ date: string; duration: number; source: string }>;
    }>
  > {
    const from = new Date(query.from + 'T00:00:00.000Z');
    const to = new Date(query.to + 'T00:00:00.000Z');

    const logs = await this.db.sleepLog.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: { date: true, duration: true, source: true },
      orderBy: { date: 'asc' },
    });

    const days = logs.map((log) => ({
      date: this.formatDate(log.date),
      duration: log.duration,
      source: log.source,
    }));

    return { success: true, data: { days } };
  }

  // ─── Heart Rate ─────────────────────────────────────────────────────────────

  async logHeartRateBatch(
    userId: string,
    data: LogHeartRateBatch,
  ): Promise<SuccessResponse<{ inserted: number }>> {
    const merged = downsampleHeartRateSamplesToUtcMinute(
      data.samples.map((s) => ({
        timestamp: s.timestamp,
        bpm: s.bpm,
        source: s.source,
      })),
    );
    const records = merged.map((s) => ({
      userId,
      timestamp: new Date(s.timestamp),
      bpm: s.bpm,
      source: (s.source ?? 'MANUAL') as WorkoutSessionSource,
    }));

    const result = await this.db.heartRateLog.createMany({
      data: records,
      skipDuplicates: true,
    });

    return { success: true, data: { inserted: result.count } };
  }

  async getHeartRate(
    userId: string,
    query: HeartRateQuery,
  ): Promise<SuccessResponse<{ samples: HeartRateLogResponse[] }>> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const tz = getEffectiveTimezone(profile?.timezone);
    const from = startOfZonedDayUtc(query.from, tz);
    const to = endOfZonedDayUtc(query.to, tz);

    const logs = await this.db.heartRateLog.findMany({
      where: { userId, timestamp: { gte: from, lte: to } },
      select: {
        id: true,
        timestamp: true,
        bpm: true,
        source: true,
        createdAt: true,
      },
      orderBy: { timestamp: 'asc' },
      take: 2_000,
    });

    const samples = logs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      bpm: log.bpm,
      source: log.source,
      createdAt: log.createdAt.toISOString(),
    }));

    return { success: true, data: { samples } };
  }

  async getHeartRateDailySummary(
    userId: string,
    query: HeartRateQuery,
  ): Promise<SuccessResponse<{ days: HeartRateDailySummary[] }>> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const tz = getEffectiveTimezone(profile?.timezone);
    const from = startOfZonedDayUtc(query.from, tz);
    const to = endOfZonedDayUtc(query.to, tz);

    // Page through all rows in bounded batches. A single findMany + take(N) drops
    // later days when one range already has tens of thousands of samples (e.g.
    // Apple Health), which made the last calendar days look empty.
    const BATCH = 10_000;
    const buckets = new Map<
      string,
      {
        min: number;
        max: number;
        sum: number;
        count: number;
        sources: Set<string>;
      }
    >();

    let cursorTs: Date | undefined;
    let cursorId: string | undefined;

    for (;;) {
      const batch = await this.db.heartRateLog.findMany({
        where: {
          userId,
          timestamp: { gte: from, lte: to },
          ...(cursorTs !== undefined && cursorId !== undefined
            ? {
                OR: [
                  { timestamp: { gt: cursorTs } },
                  { AND: [{ timestamp: cursorTs }, { id: { gt: cursorId } }] },
                ],
              }
            : {}),
        },
        orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
        take: BATCH,
        select: { id: true, timestamp: true, bpm: true, source: true },
      });

      if (batch.length === 0) break;

      for (const log of batch) {
        const date = formatDateInTimezone(log.timestamp, tz);
        const existing = buckets.get(date);
        if (existing) {
          existing.min = Math.min(existing.min, log.bpm);
          existing.max = Math.max(existing.max, log.bpm);
          existing.sum += log.bpm;
          existing.count++;
          existing.sources.add(log.source);
        } else {
          buckets.set(date, {
            min: log.bpm,
            max: log.bpm,
            sum: log.bpm,
            count: 1,
            sources: new Set([log.source]),
          });
        }
      }

      const last = batch.at(-1);
      if (!last) break;
      cursorTs = last.timestamp;
      cursorId = last.id;

      if (batch.length < BATCH) break;
    }

    const days: HeartRateDailySummary[] = Array.from(buckets.entries())
      .map(([date, b]) => ({
        date,
        min: b.min,
        max: b.max,
        avg: Math.round(b.sum / b.count),
        count: b.count,
        source: [...b.sources].sort().join(', '),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: { days } };
  }

  // ─── Bulk Sync (mobile client) ─────────────────────────────────────────────

  async syncHealthData(
    userId: string,
    data: SyncHealthData,
  ): Promise<SuccessResponse<SyncHealthDataResponse>> {
    let stepsUpserted = 0;
    let sleepUpserted = 0;
    let heartRateInserted = 0;
    let weightUpserted = 0;
    let waterUpserted = 0;
    let workoutsImported = 0;

    // Upsert steps
    if (data.steps?.length) {
      for (const entry of data.steps) {
        const date = new Date(entry.date + 'T00:00:00.000Z');
        await this.db.stepLog.upsert({
          where: {
            userId_date_source: { userId, date, source: data.source },
          },
          create: {
            userId,
            date,
            steps: entry.steps,
            source: data.source,
          },
          update: { steps: entry.steps },
        });
        stepsUpserted++;
      }

      await this.upsertSyncLog(userId, 'steps', data.source);
    }

    // Upsert sleep
    if (data.sleep?.length) {
      for (const entry of data.sleep) {
        const date = new Date(entry.date + 'T00:00:00.000Z');
        await this.db.sleepLog.upsert({
          where: {
            userId_date_source: { userId, date, source: data.source },
          },
          create: {
            userId,
            date,
            startTime: new Date(entry.startTime),
            endTime: new Date(entry.endTime),
            duration: entry.duration,
            source: data.source,
          },
          update: {
            startTime: new Date(entry.startTime),
            endTime: new Date(entry.endTime),
            duration: entry.duration,
          },
        });
        sleepUpserted++;
      }

      await this.upsertSyncLog(userId, 'sleep', data.source);
    }

    // Insert heart rate samples
    if (data.heartRate?.length) {
      const hrPoints = downsampleHeartRateSamplesToUtcMinute(
        data.heartRate.map((s) => ({ timestamp: s.timestamp, bpm: s.bpm })),
      );
      const records = hrPoints.map((s) => ({
        userId,
        timestamp: new Date(s.timestamp),
        bpm: s.bpm,
        source: data.source,
      }));

      const result = await this.db.heartRateLog.createMany({
        data: records,
        skipDuplicates: true,
      });
      heartRateInserted = result.count;

      await this.upsertSyncLog(userId, 'heartRate', data.source);
    }

    // Upsert weight entries (encrypted — PHI under HIPAA)
    if (data.weight?.length) {
      for (const entry of data.weight) {
        try {
          const loggedAt = new Date(entry.date + 'T12:00:00.000Z');
          const weightData = JSON.stringify({ value: entry.value, unit: 'LB' });
          const encrypted = this.encryption.encrypt(weightData);

          // No unique constraint on userId+loggedAt, so find-first then create or update
          const existing = await this.db.weightLog.findFirst({
            where: { userId, loggedAt },
            select: { id: true },
          });

          if (existing) {
            await this.db.weightLog.update({
              where: { id: existing.id },
              data: {
                encryptedData: encrypted.encryptedContent,
                dataIv: encrypted.contentIv,
                dataAuthTag: encrypted.contentAuthTag,
                wrappedKey: encrypted.wrappedKey,
              },
            });
          } else {
            await this.db.weightLog.create({
              data: {
                userId,
                loggedAt,
                encryptedData: encrypted.encryptedContent,
                dataIv: encrypted.contentIv,
                dataAuthTag: encrypted.contentAuthTag,
                wrappedKey: encrypted.wrappedKey,
              },
            });
          }
          weightUpserted++;
        } catch {
          this.logger.warn(
            `Failed to upsert weight for user ${userId} on ${entry.date}`,
          );
        }
      }

      await this.upsertSyncLog(userId, 'weight', data.source);
    }

    // Upsert water entries
    if (data.water?.length) {
      for (const entry of data.water) {
        try {
          const loggedAt = new Date(entry.date + 'T12:00:00.000Z');
          // Sum with existing manual entries or upsert for the device source
          await this.db.waterLog.create({
            data: { userId, loggedAt, amount: entry.amount },
          });
          waterUpserted++;
        } catch {
          this.logger.warn(
            `Failed to upsert water for user ${userId} on ${entry.date}`,
          );
        }
      }

      await this.upsertSyncLog(userId, 'water', data.source);
    }

    // Import workouts from device health store
    if (data.workouts?.length) {
      for (const entry of data.workouts) {
        try {
          const startedAt = new Date(entry.startDate);
          const endedAt = new Date(entry.endDate);

          // Deduplicate: prefer healthKitId if provided, fall back to source + startedAt
          let existing: { id: string } | null = null;
          if (entry.healthKitId) {
            existing = await this.db.workoutSession.findFirst({
              where: { userId, healthKitId: entry.healthKitId },
              select: { id: true },
            });
          }
          if (!existing) {
            existing = await this.db.workoutSession.findFirst({
              where: {
                userId,
                source: data.source,
                startedAt,
              },
              select: { id: true },
            });
          }

          if (!existing) {
            const durationSec = entry.duration ?? undefined;
            const distanceM = entry.distanceMeters ?? undefined;

            await this.db.workoutSession.create({
              data: {
                userId,
                source: data.source,
                title: entry.name,
                startedAt,
                endedAt,
                performed: startedAt,
                healthKitId: entry.healthKitId ?? undefined,
                externalProvider: data.source
                  .toLowerCase()
                  .replaceAll('_', '-'),
                externalActivityType: entry.activityType ?? entry.name,
                externalSummary: {
                  calories: entry.calories ?? undefined,
                  elapsedTimeSeconds: durationSec,
                  distanceMeters: distanceM,
                  averageHeartRate: entry.averageHeartRate ?? undefined,
                  maxHeartRate: entry.maxHeartRate ?? undefined,
                  averagePaceSecPerKm:
                    distanceM && durationSec && distanceM > 0
                      ? Math.round((durationSec / (distanceM / 1000)) * 100) /
                        100
                      : undefined,
                },
                importedAt: new Date(),
              },
            });
            workoutsImported++;
          }
        } catch {
          this.logger.warn(
            `Failed to import workout for user ${userId}: ${entry.name}`,
          );
        }
      }

      await this.upsertSyncLog(userId, 'workouts', data.source);
    }

    return {
      success: true,
      data: {
        stepsUpserted,
        sleepUpserted,
        heartRateInserted,
        weightUpserted,
        waterUpserted,
        workoutsImported,
      },
    };
  }

  // ─── Sync Status ────────────────────────────────────────────────────────────

  async getSyncStatus(
    userId: string,
  ): Promise<SuccessResponse<HealthSyncStatusResponse[]>> {
    const logs = await this.db.healthSyncLog.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const data = logs.map((log) => ({
      dataType: log.dataType as HealthSyncStatusResponse['dataType'],
      source: log.source,
      lastSyncedAt: log.lastSyncedAt.toISOString(),
      syncCount: log.syncCount,
    }));

    return { success: true, data };
  }

  // ─── Sync Preferences ────────────────────────────────────────────────────

  async getSyncPreferences(
    userId: string,
  ): Promise<SuccessResponse<HealthSyncPreferenceResponse>> {
    const pref = await this.db.healthSyncPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return {
      success: true,
      data: {
        id: pref.id,
        readSteps: pref.readSteps,
        readSleep: pref.readSleep,
        readHeartRate: pref.readHeartRate,
        readWeight: pref.readWeight,
        readWater: pref.readWater,
        readWorkouts: pref.readWorkouts,
        writeWeight: pref.writeWeight,
        writeWater: pref.writeWater,
        writeWorkouts: pref.writeWorkouts,
      },
    };
  }

  async updateSyncPreferences(
    userId: string,
    data: UpdateHealthSyncPreference,
  ): Promise<SuccessResponse<HealthSyncPreferenceResponse>> {
    const pref = await this.db.healthSyncPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return {
      success: true,
      data: {
        id: pref.id,
        readSteps: pref.readSteps,
        readSleep: pref.readSleep,
        readHeartRate: pref.readHeartRate,
        readWeight: pref.readWeight,
        readWater: pref.readWater,
        readWorkouts: pref.readWorkouts,
        writeWeight: pref.writeWeight,
        writeWater: pref.writeWater,
        writeWorkouts: pref.writeWorkouts,
      },
    };
  }

  // ─── Workout Export Dedup ───────────────────────────────────────────────────

  async markWorkoutExported(
    userId: string,
    sessionId: string,
    healthKitId: string,
  ): Promise<SuccessResponse<{ updated: true }> | ErrorResponse> {
    const session = await this.db.workoutSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout session not found' },
      };
    }

    await this.db.workoutSession.update({
      where: { id: sessionId },
      data: { healthKitId },
    });

    return { success: true, data: { updated: true } };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async upsertSyncLog(
    userId: string,
    dataType: string,
    source: WorkoutSessionSource,
  ): Promise<void> {
    await this.db.healthSyncLog.upsert({
      where: {
        userId_dataType_source: { userId, dataType, source },
      },
      create: {
        userId,
        dataType,
        source,
        lastSyncedAt: new Date(),
        syncCount: 1,
      },
      update: {
        lastSyncedAt: new Date(),
        syncCount: { increment: 1 },
      },
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

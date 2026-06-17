import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { DatabaseService } from "@app/database";
import { EncryptionService } from "@app/security";
import { MailService } from "@app/common/mailer";
import type {
  WeeklyReportData,
  MeasurementDeltas,
} from "@varaperformance/core";

const WEEKLY_REPORT_LOCK_KEY = 1_904_030;
const WEEKLY_REPORT_CRON = "0 0 9 * * 1"; // Monday 9 AM
const USER_BATCH_SIZE = 100;

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly encryption: EncryptionService,
  ) {}

  @Cron(WEEKLY_REPORT_CRON)
  async sendWeeklyReports(): Promise<void> {
    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${WEEKLY_REPORT_LOCK_KEY}) AS acquired
    `;
    if (!lockRows[0]?.acquired) {
      this.logger.debug("Skipping weekly report — another instance holds lock");
      return;
    }

    try {
      await this.processReports();
    } finally {
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${WEEKLY_REPORT_LOCK_KEY})
      `;
    }
  }

  private async processReports(): Promise<void> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let cursor: string | undefined;
    let totalSent = 0;

    while (true) {
      const users = await this.db.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          notificationPreferences: { digest: true },
        },
        select: {
          id: true,
          email: true,
          profile: { select: { displayName: true, timezone: true } },
        },
        orderBy: { id: "asc" },
        take: USER_BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
      });

      if (users.length === 0) break;

      for (const user of users) {
        try {
          const report = await this.buildReport(user.id, weekAgo, now);
          // Only send if user had any activity
          if (
            report.workoutsLogged === 0 &&
            report.habitsCompleted === 0 &&
            report.personalRecords === 0
          ) {
            continue;
          }

          await this.mailService.sendWeeklyReportEmail({
            email: user.email,
            name: user.profile?.displayName ?? undefined,
            userId: user.id,
            report,
          });
          totalSent++;
        } catch (err) {
          this.logger.error(
            `Failed to send weekly report to ${user.id}: ${(err as Error).message}`,
          );
        }
      }

      cursor = users[users.length - 1]?.id;
    }

    this.logger.log(`Weekly reports sent: ${totalSent}`);
  }

  /**
   * Build a weekly report for a user.
   * Also used by the backend API for in-app report card.
   */
  async buildReport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<WeeklyReportData> {
    const days = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
    );

    const [
      workoutsLogged,
      personalRecords,
      waterDays,
      habitLogs,
      bestHabitStreak,
      nutritionStats,
      workoutSummary,
      habitCompletionPercent,
      measurementDeltas,
      achievementsEarned,
      activeChallenges,
      lifestyleAdherence,
      stackCompliancePercent,
      injectionCompliancePercent,
      stepStats,
    ] = await Promise.all([
      this.db.workoutSession.count({
        where: { userId, startedAt: { gte: from, lte: to } },
      }),
      this.db.personalRecord.count({
        where: { userId, achievedAt: { gte: from, lte: to } },
      }),
      this.getWaterGoalDaysHit(userId, from, to),
      this.db.habitLog.count({
        where: {
          habit: { userId },
          completed: true,
          date: { gte: from, lte: to },
        },
      }),
      this.db.habit
        .findFirst({
          where: { userId, isActive: true },
          orderBy: { currentStreak: "desc" },
          select: { currentStreak: true },
        })
        .then((h) => h?.currentStreak ?? 0),
      this.getNutritionStats(userId, from, to),
      this.getWorkoutSummary(userId, from, to),
      this.getHabitCompletionPercent(userId, from, to, days),
      this.getMeasurementDeltas(userId, from, to, days),
      this.db.userAchievement.count({
        where: { userId, unlockedAt: { gte: from, lte: to } },
      }),
      this.db.challengeParticipant.count({
        where: {
          userId,
          challenge: { status: "ACTIVE" },
        },
      }),
      this.getLifestyleAdherence(userId, from, to, days),
      this.getStackCompliance(userId, from, to),
      this.getInjectionCompliance(userId, from, to),
      this.getStepStats(userId, from, to),
    ]);

    return {
      workoutsLogged,
      personalRecords,
      waterGoalDaysHit: waterDays,
      habitsCompleted: habitLogs,
      currentHabitStreak: bestHabitStreak,
      caloriesAvg: nutritionStats.caloriesAvg,
      proteinAvg: nutritionStats.proteinAvg,
      carbsAvg: nutritionStats.carbsAvg,
      fatsAvg: nutritionStats.fatsAvg,
      nutritionLoggedDays: nutritionStats.loggedDays,
      workoutDurationMinutes: workoutSummary.durationMinutes,
      totalVolume: workoutSummary.totalVolume,
      muscleGroupsTrained: workoutSummary.muscleGroupsTrained,
      habitCompletionPercent,
      measurementDeltas,
      achievementsEarned,
      activeChallenges,
      lifestyleAdherenceScore: lifestyleAdherence.current,
      lifestyleAdherencePrevious: lifestyleAdherence.previous,
      avgDailySteps: stepStats.avgDailySteps,
      stepGoalDaysHit: stepStats.goalDaysHit,
      stackCompliancePercent,
      injectionCompliancePercent,
    };
  }

  private async getStepStats(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ avgDailySteps: number | null; goalDaysHit: number }> {
    const [stepLogs, goal] = await Promise.all([
      this.db.stepLog.findMany({
        where: { userId, date: { gte: from, lte: to } },
        select: { date: true, steps: true },
      }),
      this.db.lifestyleGoal.findUnique({
        where: { userId },
        select: { dailySteps: true },
      }),
    ]);

    if (stepLogs.length === 0) {
      return { avgDailySteps: null, goalDaysHit: 0 };
    }

    const dailyTotals = new Map<string, number>();
    for (const log of stepLogs) {
      const key = log.date.toISOString().split("T")[0];
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + log.steps);
    }

    const dayValues = [...dailyTotals.values()];
    const totalSteps = dayValues.reduce((sum, s) => sum + s, 0);
    const avgDailySteps = Math.round(totalSteps / dailyTotals.size);
    const goalTarget = goal?.dailySteps ?? 10_000;
    const goalDaysHit = dayValues.filter((s) => s >= goalTarget).length;

    return { avgDailySteps, goalDaysHit };
  }

  private async getWaterGoalDaysHit(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const goal = await this.db.waterGoal.findUnique({
      where: { userId },
      select: { targetAmount: true },
    });
    if (!goal) return 0;

    const logs = await this.db.waterLog.findMany({
      where: { userId, loggedAt: { gte: from, lte: to } },
      select: { loggedAt: true, amount: true },
    });

    const dailyTotals = new Map<string, number>();
    for (const row of logs) {
      const key = row.loggedAt.toISOString().split("T")[0];
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + row.amount);
    }

    let daysHit = 0;
    for (const total of dailyTotals.values()) {
      if (total >= goal.targetAmount) daysHit++;
    }
    return daysHit;
  }

  private async getNutritionStats(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{
    caloriesAvg: number | null;
    proteinAvg: number | null;
    carbsAvg: number | null;
    fatsAvg: number | null;
    loggedDays: number;
  }> {
    const [agg, loggedDaysResult] = await Promise.all([
      this.db.foodLog.aggregate({
        where: { userId, loggedAt: { gte: from, lte: to } },
        _avg: {
          totalCalories: true,
          totalProtein: true,
          totalCarbs: true,
          totalFat: true,
        },
      }),
      this.db.foodLog.findMany({
        where: { userId, loggedAt: { gte: from, lte: to } },
        select: { loggedAt: true },
        distinct: ["loggedAt"],
      }),
    ]);

    const uniqueDates = new Set(
      loggedDaysResult.map((r) => r.loggedAt.toISOString().split("T")[0]),
    );

    return {
      caloriesAvg: agg._avg.totalCalories
        ? Math.round(agg._avg.totalCalories)
        : null,
      proteinAvg: agg._avg.totalProtein
        ? Math.round(agg._avg.totalProtein)
        : null,
      carbsAvg: agg._avg.totalCarbs ? Math.round(agg._avg.totalCarbs) : null,
      fatsAvg: agg._avg.totalFat ? Math.round(agg._avg.totalFat) : null,
      loggedDays: uniqueDates.size,
    };
  }

  private async getWorkoutSummary(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{
    durationMinutes: number;
    totalVolume: number;
    muscleGroupsTrained: number;
  }> {
    const sessions = await this.db.workoutSession.findMany({
      where: { userId, startedAt: { gte: from, lte: to } },
      select: {
        startedAt: true,
        endedAt: true,
        workouts: {
          select: {
            exercise: {
              select: {
                muscleGroups: {
                  where: { isPrimary: true },
                  select: { muscleGroup: true },
                },
              },
            },
            sets: { select: { weight: true, reps: true } },
          },
        },
      },
    });

    let durationMinutes = 0;
    let totalVolume = 0;
    const muscleGroups = new Set<string>();

    for (const session of sessions) {
      if (session.startedAt && session.endedAt) {
        durationMinutes += Math.round(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 60_000,
        );
      }
      for (const workout of session.workouts) {
        for (const mg of workout.exercise?.muscleGroups ?? []) {
          muscleGroups.add(mg.muscleGroup);
        }
        for (const set of workout.sets) {
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      }
    }

    return {
      durationMinutes,
      totalVolume: Math.round(totalVolume),
      muscleGroupsTrained: muscleGroups.size,
    };
  }

  private async getHabitCompletionPercent(
    userId: string,
    from: Date,
    to: Date,
    days: number,
  ): Promise<number | null> {
    const activeHabits = await this.db.habit.count({
      where: { userId, isActive: true },
    });
    if (activeHabits === 0) return null;

    const completedLogs = await this.db.habitLog.count({
      where: {
        habit: { userId, isActive: true },
        completed: true,
        date: { gte: from, lte: to },
      },
    });

    const totalPossible = activeHabits * days;
    return Math.round((completedLogs / totalPossible) * 100);
  }

  private async getMeasurementDeltas(
    userId: string,
    from: Date,
    to: Date,
    days: number,
  ): Promise<MeasurementDeltas | null> {
    const latest = await this.db.bodyMeasurement.findFirst({
      where: { userId, loggedAt: { gte: from, lte: to } },
      orderBy: { loggedAt: "desc" },
      select: {
        encryptedData: true,
        dataIv: true,
        dataAuthTag: true,
        wrappedKey: true,
      },
    });
    if (!latest) return null;

    const previousFrom = new Date(from);
    previousFrom.setDate(previousFrom.getDate() - days);
    const previous = await this.db.bodyMeasurement.findFirst({
      where: { userId, loggedAt: { gte: previousFrom, lt: from } },
      orderBy: { loggedAt: "desc" },
      select: {
        encryptedData: true,
        dataIv: true,
        dataAuthTag: true,
        wrappedKey: true,
      },
    });
    if (!previous) return null;

    try {
      const latestData = JSON.parse(
        this.encryption
          .decrypt({
            encryptedContent: Buffer.from(latest.encryptedData),
            contentIv: Buffer.from(latest.dataIv),
            contentAuthTag: Buffer.from(latest.dataAuthTag),
            wrappedKey: Buffer.from(latest.wrappedKey),
          })
          .toString(),
      );
      const previousData = JSON.parse(
        this.encryption
          .decrypt({
            encryptedContent: Buffer.from(previous.encryptedData),
            contentIv: Buffer.from(previous.dataIv),
            contentAuthTag: Buffer.from(previous.dataAuthTag),
            wrappedKey: Buffer.from(previous.wrappedKey),
          })
          .toString(),
      );

      const delta = (curr: number | null, prev: number | null) =>
        curr != null && prev != null
          ? Math.round((curr - prev) * 10) / 10
          : null;

      return {
        waist: delta(latestData.waist ?? null, previousData.waist ?? null),
        chest: delta(latestData.chest ?? null, previousData.chest ?? null),
        hips: delta(latestData.hips ?? null, previousData.hips ?? null),
      };
    } catch {
      this.logger.warn(`Failed to decrypt measurement data for user ${userId}`);
      return null;
    }
  }

  private async getLifestyleAdherence(
    userId: string,
    from: Date,
    to: Date,
    days: number,
  ): Promise<{ current: number | null; previous: number | null }> {
    const previousFrom = new Date(from);
    previousFrom.setDate(previousFrom.getDate() - days);

    const [workoutGoal, lifestyleGoal, sessions, foodLogs, waterLogs] =
      await Promise.all([
        this.db.workoutGoal.findUnique({
          where: { userId },
          select: { weeklyWorkouts: true },
        }),
        this.db.lifestyleGoal.findUnique({
          where: { userId },
          select: { checkInsPerWeek: true },
        }),
        this.db.workoutSession.findMany({
          where: { userId, performed: { gte: previousFrom, lte: to } },
          select: { performed: true },
        }),
        this.db.foodLog.findMany({
          where: { userId, loggedAt: { gte: previousFrom, lte: to } },
          select: { loggedAt: true },
        }),
        this.db.waterLog.findMany({
          where: { userId, loggedAt: { gte: previousFrom, lte: to } },
          select: { loggedAt: true },
        }),
      ]);

    if (
      sessions.length === 0 &&
      foodLogs.length === 0 &&
      waterLogs.length === 0
    ) {
      return { current: null, previous: null };
    }

    const workoutTarget = workoutGoal?.weeklyWorkouts ?? 4;
    const checkInTarget = lifestyleGoal?.checkInsPerWeek ?? 4;

    const bucket = (
      items: Array<{ performed?: Date; loggedAt?: Date }>,
      start: Date,
      end: Date,
    ) => {
      const dates = new Set<string>();
      for (const item of items) {
        const d = item.performed ?? item.loggedAt;
        if (d && d >= start && d <= end) {
          dates.add(d.toISOString().split("T")[0]);
        }
      }
      return dates.size;
    };

    const score = (start: Date, end: Date) => {
      const workoutDays = bucket(
        sessions.map((s) => ({ performed: s.performed })),
        start,
        end,
      );
      const nutritionDays = bucket(
        foodLogs.map((f) => ({ loggedAt: f.loggedAt })),
        start,
        end,
      );
      const hydrationDays = bucket(
        waterLogs.map((w) => ({ loggedAt: w.loggedAt })),
        start,
        end,
      );

      const clamp = (v: number) => Math.max(0, Math.min(100, v));
      const pct = (v: number, t: number) =>
        t <= 0 ? 0 : clamp(Math.round((v / t) * 100));

      return clamp(
        Math.round(
          pct(workoutDays, workoutTarget) * 0.4 +
            pct(nutritionDays, 7) * 0.2 +
            pct(hydrationDays, 7) * 0.2 +
            pct(workoutDays, checkInTarget) * 0.2,
        ),
      );
    };

    return { current: score(from, to), previous: score(previousFrom, from) };
  }

  private async getStackCompliance(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<number | null> {
    const activeStack = await this.db.stack.findFirst({
      where: { userId, isActive: true },
      select: { items: { select: { id: true } } },
    });

    if (!activeStack || activeStack.items.length === 0) return null;

    const itemIds = activeStack.items.map((i) => i.id);
    const diffDays = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const totalExpected = itemIds.length * diffDays;

    const takenCount = await this.db.stackLog.count({
      where: {
        stackItemId: { in: itemIds },
        date: { gte: from, lte: to },
        taken: true,
      },
    });

    return Math.min(100, Math.round((takenCount / totalExpected) * 100));
  }

  private async getInjectionCompliance(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<number | null> {
    const protocolCount = await this.db.injectionProtocol.count({
      where: { userId },
    });

    if (protocolCount === 0) return null;

    const diffDays = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const expectedWeeks = Math.max(1, Math.ceil(diffDays / 7));
    const totalExpected = protocolCount * expectedWeeks;

    const loggedCount = await this.db.injectionLog.count({
      where: { userId, loggedAt: { gte: from, lte: to } },
    });

    return Math.min(100, Math.round((loggedCount / totalExpected) * 100));
  }
}

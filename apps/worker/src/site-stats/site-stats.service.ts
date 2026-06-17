import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DatabaseService } from "@app/database";

/** Stats keys that map to home page metrics. */
const STAT_KEYS = {
  ACTIVE_USERS: "active_users",
  WORKOUTS_LOGGED: "workouts_logged",
  PERSONAL_RECORDS: "personal_records",
  EXERCISES_AVAILABLE: "exercises_available",
} as const;

const SITE_STATS_LOCK_KEY = 1_904_024;

@Injectable()
export class SiteStatsService {
  private readonly logger = new Logger(SiteStatsService.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    this.logger.log("Site stats initializing...");
    await this.refreshStats();
    this.logger.log("Site stats initialized");
  }

  /** Refresh site stats every 10 minutes. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async refreshStats(): Promise<void> {
    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${SITE_STATS_LOCK_KEY}) AS acquired
    `;
    if (!lockRows[0]?.acquired) {
      this.logger.debug(
        "Skipping site stats refresh because another instance holds the lock",
      );
      return;
    }

    try {
      await this.doRefreshStats();
    } finally {
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${SITE_STATS_LOCK_KEY})
      `;
    }
  }

  private async doRefreshStats(): Promise<void> {
    this.logger.debug("Refreshing site stats...");

    const [activeUsers, workoutsLogged, personalRecords, exercisesAvailable] =
      await Promise.all([
        this.db.user.count({ where: { isVerified: true } }),
        this.db.workoutSession.count(),
        this.db.personalRecord.count(),
        this.db.exercise.count(),
      ]);

    const stats: Record<string, number> = {
      [STAT_KEYS.ACTIVE_USERS]: activeUsers,
      [STAT_KEYS.WORKOUTS_LOGGED]: workoutsLogged,
      [STAT_KEYS.PERSONAL_RECORDS]: personalRecords,
      [STAT_KEYS.EXERCISES_AVAILABLE]: exercisesAvailable,
    };

    for (const [key, value] of Object.entries(stats)) {
      await this.db.siteStat.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    this.logger.log(
      `Stats refreshed: users=${activeUsers}, workouts=${workoutsLogged}, PRs=${personalRecords}, exercises=${exercisesAvailable}`,
    );
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DatabaseService } from "@app/database";
import axios from "axios";

const HEALTH_SYNC_LOCK_KEY = 1_904_025;

/**
 * Hourly cron that triggers a bulk sync for every registered health provider.
 * Uses the backend's internal `POST /v1/integrations/health/internal/sync-all`
 * endpoint, which delegates to `HealthSyncService.syncAllUsers()`.
 */
@Injectable()
export class HealthSyncSchedulerService {
  private readonly logger = new Logger(HealthSyncSchedulerService.name);

  constructor(private readonly db: DatabaseService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncConnectedHealthUsers(): Promise<void> {
    const backendUrl = process.env.BACKEND_URL?.trim();
    const internalApiKey = process.env.INTERNAL_API_KEY?.trim();

    if (!backendUrl || !internalApiKey) {
      this.logger.debug(
        "Skipping scheduled health sync because BACKEND_URL or INTERNAL_API_KEY is not configured",
      );
      return;
    }

    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${HEALTH_SYNC_LOCK_KEY}) AS acquired
    `;
    if (!lockRows[0]?.acquired) {
      this.logger.debug(
        "Skipping health sync because another instance holds the lock",
      );
      return;
    }

    const baseUrl = backendUrl.replace(/\/$/, "");
    const providers = ["strava", "withings"];

    try {
      for (const provider of providers) {
        try {
          const url = `${baseUrl}/v1/integrations/health/internal/sync-all`;
          const response = await axios.post(
            url,
            { provider, maxUsers: 500 },
            {
              timeout: 120_000,
              headers: { "x-internal-api-key": internalApiKey },
            },
          );

          this.logger.log(
            { provider, result: response.data?.data },
            "Scheduled health sync completed",
          );
        } catch (error) {
          this.logger.warn(
            { err: error, provider },
            "Scheduled health sync failed for provider",
          );
        }
      }
    } finally {
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${HEALTH_SYNC_LOCK_KEY})
      `;
    }
  }
}

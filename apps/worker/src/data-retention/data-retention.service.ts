import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DatabaseService } from "@app/database";
import { Prisma } from "@generated/prisma";

/**
 * GDPR Art. 5(1)(e), Art. 17 — Data Retention Purge Scheduler
 *
 * Runs daily at 02:00 UTC. For each expired, non-hold DataRetention record:
 *  1. Delete the referenced resource (anonymize/hard-delete)
 *  2. Mark the DataRetention record as completed (deletedAt set)
 *
 * Uses pg_try_advisory_lock to prevent concurrent execution across replicas.
 */

const RETENTION_LOCK_KEY = 1_904_030;
const BATCH_SIZE = 100;

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);
  private isProcessing = false;

  constructor(private readonly db: DatabaseService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeExpiredRetentions(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug("Already processing retention purge, skipping");
      return;
    }

    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${RETENTION_LOCK_KEY}) AS acquired
    `;
    const acquired = lockRows[0]?.acquired === true;
    if (!acquired) {
      this.logger.debug(
        "Skipping retention purge — another instance holds the lock",
      );
      return;
    }

    this.isProcessing = true;
    let totalPurged = 0;
    let totalFailed = 0;

    try {
      this.logger.log("Starting data retention purge cycle");

      // Process in batches to avoid long-running queries
      let hasMore = true;
      while (hasMore) {
        const expiredRecords = await this.db.dataRetention.findMany({
          where: {
            retainUntil: { lte: new Date() },
            legalHold: false,
            deletedAt: null,
          },
          take: BATCH_SIZE,
          orderBy: { retainUntil: "asc" },
        });

        if (expiredRecords.length === 0) {
          hasMore = false;
          break;
        }

        for (const record of expiredRecords) {
          try {
            await this.purgeResource(record.resource, record.resourceId);

            // Mark retention record as completed
            await this.db.dataRetention.update({
              where: { id: record.id },
              data: {
                deletedAt: new Date(),
                retentionNotes: `Purged by retention scheduler at ${new Date().toISOString()}`,
              },
            });

            totalPurged++;
          } catch (error) {
            totalFailed++;
            this.logger.error(
              `Failed to purge ${record.resource}:${record.resourceId}`,
              error instanceof Error ? error.stack : error,
            );
          }
        }

        // If we got fewer than BATCH_SIZE, we're done
        if (expiredRecords.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      this.logger.log(
        `Retention purge complete: ${totalPurged} purged, ${totalFailed} failed`,
      );
    } finally {
      this.isProcessing = false;
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${RETENTION_LOCK_KEY})
      `;
    }
  }

  /**
   * Purge a resource based on its type and ID.
   * Each resource type has its own cleanup strategy.
   */
  private async purgeResource(
    resource: string,
    resourceId: string,
  ): Promise<void> {
    switch (resource) {
      case "User":
        // User already soft-deleted by account deletion flow.
        // Purge any remaining anonymized audit logs for this user.
        await this.db.auditLog.deleteMany({
          where: { userId: resourceId },
        });
        // Remove the user record entirely
        await this.db.user.deleteMany({
          where: { id: resourceId, isActive: false },
        });
        break;

      case "AuditLog":
        await this.db.auditLog.deleteMany({
          where: { id: resourceId },
        });
        break;

      case "Payment":
        // Anonymize payment record (retain structure for accounting)
        await this.db.payment.updateMany({
          where: { id: resourceId },
          data: { failureMessage: null },
        });
        break;

      case "ShopOrder":
        // Anonymize order PII while retaining financial record
        await this.db.shopOrder.updateMany({
          where: { id: resourceId },
          data: {
            email: "redacted@redacted.local",
            notes: null,
            metadata: Prisma.DbNull,
          },
        });
        break;

      default:
        this.logger.warn(
          `Unknown resource type "${resource}" for retention purge, skipping`,
        );
    }
  }
}

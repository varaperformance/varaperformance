import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { AuditService } from '@app/common/audit';
import type {
  HealthProvider,
  HealthProviderSyncResult,
} from './health-provider.interface';
import { HealthTokenService } from './health-token.service';

export interface SyncAllResult {
  scannedUsers: number;
  syncedUsers: number;
  failedUsers: number;
  totalImported: number;
}

@Injectable()
export class HealthSyncService {
  private readonly logger = new Logger(HealthSyncService.name);
  private readonly providers = new Map<string, HealthProvider>();

  constructor(
    private readonly db: DatabaseService,
    private readonly tokens: HealthTokenService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Provider registry
  // ---------------------------------------------------------------------------

  registerProvider(provider: HealthProvider): void {
    this.providers.set(provider.providerKey, provider);
    this.logger.log(`Registered health provider: ${provider.providerKey}`);
  }

  getProvider(key: string): HealthProvider {
    const provider = this.providers.get(key);
    if (!provider) {
      throw new NotFoundException(`Health provider '${key}' not registered`);
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // ---------------------------------------------------------------------------
  // Single-user sync (with audit + import tracking)
  // ---------------------------------------------------------------------------

  async syncUser(
    providerKey: string,
    userId: string,
    trigger: 'scheduled' | 'manual' | 'backfill' = 'manual',
  ): Promise<HealthProviderSyncResult> {
    const provider = this.getProvider(providerKey);
    const startMs = Date.now();

    let result: HealthProviderSyncResult;
    let errorMessage: string | undefined;

    try {
      result = await provider.syncData(userId);
    } catch (error) {
      const durationMs = Date.now() - startMs;
      errorMessage =
        error instanceof Error ? error.message : 'Unknown sync error';

      await this.recordImport(userId, providerKey, trigger, {
        importedCount: 0,
        failedCount: 1,
        durationMs,
        errorMessage,
      });

      throw error;
    }

    const durationMs = Date.now() - startMs;

    await this.recordImport(userId, providerKey, trigger, {
      importedCount: result.importedCount,
      durationMs,
    });

    this.audit.logHealthImport(userId, providerKey, {
      trigger,
      importedCount: result.importedCount,
      durationMs,
    });

    return result;
  }

  // ---------------------------------------------------------------------------
  // Bulk sync (replaces Strava's syncAllConnectedUsers)
  // ---------------------------------------------------------------------------

  async syncAllUsers(
    providerKey: string,
    opts: { maxUsers?: number } = {},
  ): Promise<SyncAllResult> {
    const provider = this.getProvider(providerKey);
    const maxUsers = Math.min(Math.max(opts.maxUsers ?? 500, 1), 5000);

    const keyStores = await this.db.keyStore.findMany({
      select: { userId: true },
      take: maxUsers,
      orderBy: { updatedAt: 'desc' },
    });

    let syncedUsers = 0;
    let failedUsers = 0;
    let totalImported = 0;

    for (const record of keyStores) {
      try {
        const connected = await provider.isConnected(record.userId);
        if (!connected) continue;

        const result = await this.syncUser(
          providerKey,
          record.userId,
          'scheduled',
        );
        syncedUsers += 1;
        totalImported += result.importedCount;
      } catch (error) {
        failedUsers += 1;
        this.logger.warn(
          { err: error, userId: record.userId, provider: providerKey },
          'Scheduled sync failed for user',
        );
      }
    }

    return {
      scannedUsers: keyStores.length,
      syncedUsers,
      failedUsers,
      totalImported,
    };
  }

  // ---------------------------------------------------------------------------
  // Import record persistence
  // ---------------------------------------------------------------------------

  private async recordImport(
    userId: string,
    provider: string,
    trigger: string,
    data: {
      importedCount?: number;
      skippedCount?: number;
      failedCount?: number;
      durationMs?: number;
      errorMessage?: string;
    },
  ): Promise<void> {
    try {
      await this.db.healthDataImport.create({
        data: {
          userId,
          provider,
          trigger,
          importedCount: data.importedCount ?? 0,
          skippedCount: data.skippedCount ?? 0,
          failedCount: data.failedCount ?? 0,
          durationMs: data.durationMs,
          errorMessage: data.errorMessage,
        },
      });
    } catch (error) {
      this.logger.warn(
        { err: error, userId, provider },
        'Failed to record health data import',
      );
    }
  }
}
